const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const express = require('express');
const rateLimit = require('express-rate-limit');

class VideoSecurityManager {
    constructor(options = {}) {
        this.secretKey = options.secretKey || process.env.VIDEO_SECRET_KEY;
        this.tokenExpiry = options.tokenExpiry || 3600; // 1 hour
        this.allowedDomains = options.allowedDomains || [process.env.DOMAIN];
        this.encryptionKey = options.encryptionKey || process.env.HLS_ENCRYPTION_KEY;
    }

    // Generate secure streaming token
    generateStreamToken(userId, videoId, userIP, sessionId) {
        const payload = {
            userId,
            videoId,
            userIP,
            sessionId,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + this.tokenExpiry
        };

        return jwt.sign(payload, this.secretKey, { algorithm: 'HS256' });
    }

    // Validate streaming token
    validateStreamToken(token, userIP, sessionId) {
        try {
            const decoded = jwt.verify(token, this.secretKey);
            
            // Verify IP and session
            if (decoded.userIP !== userIP || decoded.sessionId !== sessionId) {
                throw new Error('Invalid session or IP');
            }

            return decoded;
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    // Generate secure HLS playlist URL
    generateSecurePlaylistUrl(videoId, token) {
        const baseUrl = process.env.CDN_BASE_URL || '/videos';
        return `${baseUrl}/${videoId}/playlist.m3u8?token=${token}&t=${Date.now()}`;
    }

    // Generate HLS encryption key
    generateHLSEncryptionKey(videoId) {
        const keyData = crypto.createHash('sha256')
            .update(`${this.encryptionKey}:${videoId}`)
            .digest();
        
        return keyData.slice(0, 16); // AES-128 requires 16 bytes
    }

    // Middleware for validating video requests
    validateVideoRequest() {
        return async (req, res, next) => {
            try {
                const { token } = req.query;
                const userIP = req.ip || req.connection.remoteAddress;
                const sessionId = req.session && req.session.id;
                const referer = req.get('Referer');

                // Check referer for anti-hotlinking
                if (!this.isValidReferer(referer)) {
                    return res.status(403).json({ error: 'Invalid referer' });
                }

                // Validate token
                const decoded = this.validateStreamToken(token, userIP, sessionId);
                
                req.videoAccess = decoded;
                next();
            } catch (error) {
                res.status(403).json({ error: error.message });
            }
        };
    }

    // Check if referer is from allowed domains
    isValidReferer(referer) {
        if (!referer) return false;
        
        try {
            const refererUrl = new URL(referer);
            return this.allowedDomains.some(domain => 
                refererUrl.hostname === domain || 
                refererUrl.hostname.endsWith(`.${domain}`)
            );
        } catch {
            return false;
        }
    }

    // Rate limiting for video requests
    createVideoRateLimit() {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // Limit each IP to 100 requests per windowMs
            message: 'Too many video requests, please try again later',
            standardHeaders: true,
            legacyHeaders: false
        });
    }
}

// Express routes for video security
function createVideoSecurityRoutes(securityManager) {
    const router = express.Router();

    // Apply rate limiting
    router.use(securityManager.createVideoRateLimit());

    // Generate secure streaming URL
    router.post('/secure-url', async (req, res) => {
        try {
            const { videoId, userId } = req.body;
            const userIP = req.ip || req.connection.remoteAddress;
            const sessionId = req.session && req.session.id;

            // Verify user has access to this video
            const hasAccess = await verifyUserVideoAccess(userId, videoId);
            if (!hasAccess) {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Generate token
            const token = securityManager.generateStreamToken(userId, videoId, userIP, sessionId);
            
            // Generate secure playlist URL
            const streamUrl = securityManager.generateSecurePlaylistUrl(videoId, token);

            res.json({
                streamUrl,
                expiresIn: securityManager.tokenExpiry,
                token
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to generate secure URL' });
        }
    });

    // Serve HLS playlist
    router.get('/:videoId/playlist.m3u8', 
        securityManager.validateVideoRequest(),
        async (req, res) => {
            try {
                const { videoId } = req.params;
                const playlistPath = `./videos/${videoId}/playlist.m3u8`;
                
                // Read and modify playlist to include token in segment URLs
                const playlist = await modifyPlaylistWithTokens(playlistPath, req.query.token);
                
                res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.send(playlist);
            } catch (error) {
                res.status(404).json({ error: 'Playlist not found' });
            }
        }
    );

    // Serve HLS segments
    router.get('/:videoId/:segment', 
        securityManager.validateVideoRequest(),
        (req, res) => {
            const { videoId, segment } = req.params;
            const segmentPath = `./videos/${videoId}/${segment}`;
            
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            res.sendFile(segmentPath, { root: process.cwd() });
        }
    );

    // Serve encryption keys
    router.get('/:videoId/key', 
        securityManager.validateVideoRequest(),
        (req, res) => {
            const { videoId } = req.params;
            const encryptionKey = securityManager.generateHLSEncryptionKey(videoId);
            
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.send(encryptionKey);
        }
    );

    return router;
}

// Helper function to verify user access
async function verifyUserVideoAccess(userId, videoId) {
    // Implement your access control logic here
    // Check user subscription, video availability, etc.
    return true; // Placeholder
}

// Helper function to modify playlist with tokens
async function modifyPlaylistWithTokens(playlistPath, token) {
    const fs = require('fs').promises;
    const playlist = await fs.readFile(playlistPath, 'utf8');
    
    // Add token to segment URLs
    return playlist.replace(
        /(.*\.ts)/g, 
        `$1?token=${token}&t=${Date.now()}`
    );
}

module.exports = {
    VideoSecurityManager,
    createVideoSecurityRoutes
};