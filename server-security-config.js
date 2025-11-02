const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { VideoSecurityManager, createVideoSecurityRoutes } = require('./video-security-backend');

const app = express();

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://vjs.zencdn.net", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://vjs.zencdn.net"],
            mediaSrc: ["'self'", "blob:"],
            connectSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https:"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: false
}));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'dramatize-default-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize video security
const videoSecurity = new VideoSecurityManager({
    secretKey: process.env.VIDEO_SECRET_KEY,
    tokenExpiry: 3600, // 1 hour
    allowedDomains: [process.env.DOMAIN],
    encryptionKey: process.env.HLS_ENCRYPTION_KEY
});

// Video security routes
app.use('/api/video', createVideoSecurityRoutes(videoSecurity));

// Additional security middleware for static video files
app.use('/videos', (req, res, next) => {
    // Block direct access to video files
    const referer = req.get('Referer');
    if (!referer || !referer.includes(process.env.DOMAIN)) {
        return res.status(403).send('Direct access not allowed');
    }
    next();
});

module.exports = app;