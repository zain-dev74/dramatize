require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const jwt = require('jsonwebtoken');
const securityApp = require('./server-security-config');

// Import database models and functions
const { 
  Drama, 
  Episode, 
  FeaturedContent, 
  Analytics, 
  AnalyticsSummary, 
  AdminUser, 
  sequelize,
  getDramasByCategory,
  getDramaWithEpisodes,
  getAllDramasWithEpisodes
} = require('./database');

// Create main app
const app = express();
const PORT = process.env.PORT || 3000; // Main website on port 3000

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'admin/uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.sendStatus(401);
    }
    
    // Handle simple auth token
    if (token === 'simple-auth-token') {
        req.user = { username: 'famsh.05' };
        return next();
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Database operations have replaced file-based data storage

// API Routes

// Login endpoint
// Replace lines 75-85 with environment-based authentication
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Use environment variables only
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign(
            { username: process.env.ADMIN_USERNAME },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({ token, user: { username: process.env.ADMIN_USERNAME } });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

// Validate token
app.get('/api/validate', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// Get all dramas
// Public endpoint for frontend to fetch dramas
app.get('/api/dramas', async (req, res) => {
    try {
        // Add cache-busting headers
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
        // Get all dramas with episodes from database
        const allDramas = await getAllDramasWithEpisodes();
        
        // Organize by category for frontend compatibility
        const dramasData = {
            korean: allDramas.filter(drama => drama.category === 'korean'),
            chinese: allDramas.filter(drama => drama.category === 'chinese'),
            thai: allDramas.filter(drama => drama.category === 'thai'),
            japanese: allDramas.filter(drama => drama.category === 'japanese'),
            explanation: allDramas.filter(drama => drama.category === 'explanation')
        };
        
        res.json(dramasData);
    } catch (error) {
        console.error('Error loading dramas:', error);
        res.status(500).json({ message: 'Error loading dramas' });
    }
});

// Authenticated endpoint for admin operations
app.get('/api/dramas/admin', authenticateToken, async (req, res) => {
    try {
        const allDramas = await getAllDramasWithEpisodes();
        
        // Organize by category for admin compatibility
        const dramasData = {
            korean: allDramas.filter(drama => drama.category === 'korean'),
            chinese: allDramas.filter(drama => drama.category === 'chinese'),
            thai: allDramas.filter(drama => drama.category === 'thai'),
            japanese: allDramas.filter(drama => drama.category === 'japanese')
        };
        
        res.json(dramasData);
    } catch (error) {
        console.error('Error loading dramas:', error);
        res.status(500).json({ message: 'Error loading dramas' });
    }
});

// Add new drama
app.post('/api/dramas', authenticateToken, upload.single('thumbnail'), async (req, res) => {
    try {
        const { title, description, episodes, genre, status, category, videoUrl, videoSource } = req.body;
        
        const dramaData = {
            title,
            description,
            genre,
            status,
            category,
            videoUrl,
            videoSource,
            episodeCount: episodes ? parseInt(episodes) : 1,
            thumbnail: req.file ? `/admin/uploads/${req.file.filename}` : null
        };
        
        const newDrama = await Drama.create(dramaData);
        
        res.status(201).json({ 
            message: 'Drama added successfully', 
            drama: newDrama 
        });
    } catch (error) {
        console.error('Error adding drama:', error);
        res.status(500).json({ message: 'Error adding drama' });
    }
});

// Update drama
app.put('/api/dramas/:category/:id', authenticateToken, upload.single('thumbnail'), async (req, res) => {
    try {
        const { category, id } = req.params;
        const { title, description, episodes, genre, status, videoUrl, videoSource } = req.body;
        
        const drama = await Drama.findByPk(id);
        if (!drama) {
            return res.status(404).json({ message: 'Drama not found' });
        }
        
        const updateData = {
            title: title || drama.title,
            description: description || drama.description,
            episodeCount: episodes ? parseInt(episodes) : drama.episodeCount,
            genre: genre || drama.genre,
            status: status || drama.status,
            videoUrl: videoUrl || drama.videoUrl,
            videoSource: videoSource || drama.videoSource,
            thumbnail: req.file ? `/admin/uploads/${req.file.filename}` : drama.thumbnail
        };
        
        await drama.update(updateData);
        
        res.json({ 
            message: 'Drama updated successfully', 
            drama: drama 
        });
    } catch (error) {
        console.error('Error updating drama:', error);
        res.status(500).json({ message: 'Error updating drama' });
    }
});

// Delete drama
app.delete('/api/dramas/:category/:id', authenticateToken, async (req, res) => {
    try {
        const { category, id } = req.params;
        
        const drama = await Drama.findByPk(id);
        if (!drama) {
            return res.status(404).json({ message: 'Drama not found' });
        }
        
        // Delete associated episodes first
        await Episode.destroy({
            where: { dramaId: id }
        });
        
        // Delete the drama
        await drama.destroy();
        
        res.json({ message: 'Drama deleted successfully' });
    } catch (error) {
        console.error('Error deleting drama:', error);
        res.status(500).json({ message: 'Error deleting drama' });
    }
});

// Featured content operations now use database

// Get featured content
app.get('/api/featured-content', async (req, res) => {
    try {
        const featuredContent = await FeaturedContent.findAll({
            order: [['position', 'ASC']]
        });
        res.json(featuredContent);
    } catch (error) {
        console.error('Error fetching featured content:', error);
        res.status(500).json({ message: 'Error fetching featured content' });
    }
});

app.post('/api/featured-content', authenticateToken, async (req, res) => {
    try {
        const featuredData = req.body;
        const newFeatured = await FeaturedContent.create(featuredData);
        res.json({
            success: true,
            message: 'Featured content updated successfully',
            featured: newFeatured
        });
    } catch (error) {
        console.error('Error updating featured content:', error);
        res.status(500).json({ message: 'Error updating featured content' });
    }
});

// Initialize database connection
async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Main server database connection established successfully.');
        
        // Sync models with database
        await sequelize.sync();
        console.log('Main server database models synchronized.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
}

// Serve uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'admin/uploads')));

// Serve static files with cache-busting headers for development
app.use(express.static(__dirname, {
    setHeaders: (res, path) => {
        // Disable caching for CSS, JS, and HTML files during development
        if (path.endsWith('.css') || path.endsWith('.js') || path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// Use security middleware
app.use(securityApp);

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🔒 Secure Dramatize server running on port ${PORT}`);
    console.log(`🌐 Access your secure website at: http://localhost:${PORT}`);
    console.log(`🛡️ Video protection: ACTIVE`);
    console.log(`📊 Admin API: ACTIVE`);
});

// REMOVE these lines that are causing conflicts:
// const analyticsApp = require('./analytics-api');
// securityApp.listen(3000, () => {
//     console.log('Secure video server running on port 3000');
// });

// Analytics data storage
const ANALYTICS_DATA_DIR = path.join(__dirname, 'analytics-data');
const geoip = require('geoip-lite');

// Ensure analytics data directory exists
async function ensureAnalyticsDataDir() {
    try {
        await fs.access(ANALYTICS_DATA_DIR);
    } catch {
        await fs.mkdir(ANALYTICS_DATA_DIR, { recursive: true });
    }
}

// Analytics helper functions
function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

function getTodayFilePath() {
    return path.join(ANALYTICS_DATA_DIR, `analytics-${getTodayString()}.json`);
}

async function loadTodayAnalytics() {
    try {
        const data = await fs.readFile(getTodayFilePath(), 'utf8');
        return JSON.parse(data);
    } catch {
        return {
            date: getTodayString(),
            pageViews: [],
            videoEvents: [],
            searchQueries: [],
            favorites: [],
            continues: [],
            contentClicks: [],
            sessions: {},
            summary: {
                totalPageViews: 0,
                uniqueVisitors: 0,
                totalVideoPlays: 0,
                totalSearches: 0,
                avgSessionDuration: 0
            }
        };
    }
}

async function saveTodayAnalytics(data) {
    await fs.writeFile(getTodayFilePath(), JSON.stringify(data, null, 2));
}

function getClientIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
}

async function getLocationFromIP(ip) {
    try {
        const geo = geoip.lookup(ip);
        return {
            country: geo?.country || 'Unknown',
            city: geo?.city || 'Unknown',
            region: geo?.region || 'Unknown'
        };
    } catch (error) {
        return { country: 'Unknown', city: 'Unknown', region: 'Unknown' };
    }
}

function updateAnalyticsSummary(data) {
    const uniqueUsers = new Set();
    const sessionDurations = [];
    
    Object.values(data.sessions).forEach(session => {
        uniqueUsers.add(session.userId);
        if (session.duration > 0) {
            sessionDurations.push(session.duration);
        }
    });
    
    const avgSessionDuration = sessionDurations.length > 0 
        ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length 
        : 0;
    
    data.summary = {
        totalPageViews: data.pageViews.length,
        uniqueVisitors: uniqueUsers.size,
        totalVideoPlays: data.videoEvents.filter(e => e.eventType === 'play').length,
        totalSearches: data.searchQueries.length,
        avgSessionDuration: Math.round(avgSessionDuration / 1000),
        totalFavorites: data.favorites.length,
        totalContentClicks: data.contentClicks.length
    };
}

function getHourlyBreakdown(pageViews) {
    const hours = Array(24).fill(0);
    pageViews.forEach(view => {
        const hour = new Date(view.timestamp).getHours();
        hours[hour]++;
    });
    return hours;
}

function getTopContent(videoEvents, contentClicks) {
    const contentStats = {};
    
    videoEvents.forEach(event => {
        if (event.eventType === 'play') {
            const key = event.videoId;
            if (!contentStats[key]) {
                contentStats[key] = { 
                    id: key, 
                    dramaId: event.videoId,
                    title: event.videoTitle || 'Unknown Video', 
                    plays: 0, 
                    clicks: 0 
                };
            }
            contentStats[key].plays++;
            if (event.videoTitle && event.videoTitle !== 'Unknown Video') {
                contentStats[key].title = event.videoTitle;
            }
        }
    });
    
    contentClicks.forEach(click => {
        const key = click.contentId;
        if (!contentStats[key]) {
            contentStats[key] = { 
                id: key, 
                dramaId: click.contentId,
                title: click.contentTitle || 'Unknown', 
                plays: 0, 
                clicks: 0 
            };
        }
        contentStats[key].clicks++;
    });
    
    return Object.values(contentStats)
        .sort((a, b) => (b.plays + b.clicks) - (a.plays + a.clicks))
        .slice(0, 10);
}

function getTopSearchTerms(searchQueries) {
    const terms = {};
    searchQueries.forEach(search => {
        const term = (search.query || '').toLowerCase();
        if (term) {
            terms[term] = (terms[term] || 0) + 1;
        }
    });
    
    return Object.entries(terms)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([term, count]) => ({ term, count }));
}

function getDeviceBreakdown(pageViews) {
    const devices = { mobile: 0, desktop: 0, tablet: 0 };
    
    pageViews.forEach(view => {
        const ua = (view.userAgent || '').toLowerCase();
        if (/mobile|android|iphone/.test(ua)) {
            devices.mobile++;
        } else if (/tablet|ipad/.test(ua)) {
            devices.tablet++;
        } else {
            devices.desktop++;
        }
    });
    
    return devices;
}

function getActiveUsers(sessions) {
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    
    return Object.values(sessions)
        .filter(session => session.lastActivity > fiveMinutesAgo)
        .length;
}

app.post('/api/analytics', async (req, res) => {
    try {
        const eventData = req.body;
        eventData.clientIP = getClientIP(req);
        const todayData = await loadTodayAnalytics();
        
        if (eventData.type === 'pageview' || (eventData.type === 'batch' && eventData.pageViews)) {
            const location = await getLocationFromIP(eventData.clientIP);
            
            if (eventData.type === 'pageview') {
                eventData.country = location.country;
                eventData.city = location.city;
            } else if (eventData.pageViews) {
                eventData.pageViews.forEach(pv => {
                    pv.country = location.country;
                    pv.city = location.city;
                });
            }
        }
        
        switch (eventData.type) {
            case 'batch':
                todayData.pageViews.push(...eventData.pageViews);
                todayData.videoEvents.push(...eventData.videoEvents);
                todayData.searchQueries.push(...eventData.searchQueries);
                
                todayData.sessions[eventData.sessionId] = {
                    userId: eventData.userId,
                    duration: eventData.sessionDuration,
                    lastActivity: eventData.lastActivity,
                    pageViewCount: eventData.pageViews.length,
                    videoEventCount: eventData.videoEvents.length
                };
                break;
            case 'pageview':
                todayData.pageViews.push(eventData);
                break;
            case 'video':
                todayData.videoEvents.push(eventData);
                break;
            case 'search':
                todayData.searchQueries.push(eventData);
                break;
            case 'favorite':
                todayData.favorites.push(eventData);
                break;
            case 'continue':
                todayData.continues.push(eventData);
                break;
            case 'content_click':
                todayData.contentClicks.push(eventData);
                break;
        }
        
        updateAnalyticsSummary(todayData);
        await saveTodayAnalytics(todayData);
        res.json({ success: true });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to process analytics data' });
    }
});

app.get('/api/analytics/today', async (req, res) => {
    try {
        const data = await loadTodayAnalytics();
        res.json(data.summary);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
});

app.get('/api/analytics/dashboard', async (req, res) => {
    try {
        const data = await loadTodayAnalytics();
        
        const dashboard = {
            summary: data.summary,
            hourlyPageViews: getHourlyBreakdown(data.pageViews),
            topContent: getTopContent(data.videoEvents, data.contentClicks),
            searchTerms: getTopSearchTerms(data.searchQueries),
            deviceTypes: getDeviceBreakdown(data.pageViews),
            realtimeUsers: getActiveUsers(data.sessions)
        };
        
        res.json(dashboard);
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Admin panel route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Analytics dashboard route
app.get('/analytics', (req, res) => {
    res.sendFile(path.join(__dirname, 'analytics-dashboard.html'));
});

// Initialize database and analytics data directory
initializeDatabase();
ensureAnalyticsDataDir();