// Dramatize Analytics - Backend API Server
// Node.js/Express server for handling analytics data

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const geoip = require('geoip-lite');

const app = express();
const PORT = process.env.PORT || 3002;
const DATA_DIR = path.join(__dirname, 'analytics-data');

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname)); // Serve static files

// CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// Get today's date string
function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

// Get file path for today's data
function getTodayFilePath() {
    return path.join(DATA_DIR, `analytics-${getTodayString()}.json`);
}

// Load today's data
async function loadTodayData() {
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

// Save today's data
async function saveTodayData(data) {
    await fs.writeFile(getTodayFilePath(), JSON.stringify(data, null, 2));
}

// Process analytics event
async function processEvent(eventData) {
    const todayData = await loadTodayData();
    
    // Add geolocation for pageviews
    if (eventData.type === 'pageview' || (eventData.type === 'batch' && eventData.pageViews)) {
        const clientIP = eventData.clientIP || getClientIP(req);
        const location = await getLocationFromIP(clientIP);
        
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
            // Process batch data
            todayData.pageViews.push(...eventData.pageViews);
            todayData.videoEvents.push(...eventData.videoEvents);
            todayData.searchQueries.push(...eventData.searchQueries);
            
            // Update session data
            todayData.sessions[eventData.sessionId] = {
                userId: eventData.userId,
                duration: eventData.sessionDuration,
                lastActivity: eventData.lastActivity,
                pageViewCount: eventData.pageViews.length,
                videoEventCount: eventData.videoEvents.length
            };
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
            
        default:
            // Handle individual events
            if (eventData.type === 'pageview') {
                todayData.pageViews.push(eventData);
            } else if (eventData.type === 'video') {
                todayData.videoEvents.push(eventData);
            } else if (eventData.type === 'search') {
                todayData.searchQueries.push(eventData);
            }
    }
    
    // Update summary
    updateSummary(todayData);
    
    await saveTodayData(todayData);
}

// Update summary statistics
function updateSummary(data) {
    const uniqueUsers = new Set();
    const sessionDurations = [];
    
    // Count unique visitors and session durations
    Object.values(data.sessions).forEach(session => {
        uniqueUsers.add(session.userId);
        if (session.duration > 0) {
            sessionDurations.push(session.duration);
        }
    });
    
    // Calculate averages
    const avgSessionDuration = sessionDurations.length > 0 
        ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length 
        : 0;
    
    data.summary = {
        totalPageViews: data.pageViews.length,
        uniqueVisitors: uniqueUsers.size,
        totalVideoPlays: data.videoEvents.filter(e => e.eventType === 'play').length,
        totalSearches: data.searchQueries.length,
        avgSessionDuration: Math.round(avgSessionDuration / 1000), // Convert to seconds
        totalFavorites: data.favorites.length,
        totalContentClicks: data.contentClicks.length
    };
}

// API Routes

// Receive analytics data
app.post('/api/analytics', async (req, res) => {
    try {
        // Add client IP to the event data
        req.body.clientIP = getClientIP(req);
        await processEvent(req.body);
        res.json({ success: true });
    } catch (error) {
        console.error('Analytics processing error:', error);
        res.status(500).json({ error: 'Failed to process analytics data' });
    }
});

// Get today's analytics summary
app.get('/api/analytics/today', async (req, res) => {
    try {
        const data = await loadTodayData();
        res.json(data.summary);
    } catch (error) {
        console.error('Error fetching today\'s data:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
});

// Get detailed analytics for dashboard
app.get('/api/analytics/dashboard', async (req, res) => {
    try {
        const data = await loadTodayData();
        
        // Process data for dashboard
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

// Helper functions for dashboard data processing

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
                contentStats[key] = { id: key, title: event.videoTitle, plays: 0, clicks: 0 };
            }
            contentStats[key].plays++;
        }
    });
    
    contentClicks.forEach(click => {
        const key = click.contentId;
        if (!contentStats[key]) {
            contentStats[key] = { id: key, title: 'Unknown', plays: 0, clicks: 0 };
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
        const term = search.query.toLowerCase();
        terms[term] = (terms[term] || 0) + 1;
    });
    
    return Object.entries(terms)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([term, count]) => ({ term, count }));
}

function getDeviceBreakdown(pageViews) {
    const devices = { mobile: 0, desktop: 0, tablet: 0 };
    
    pageViews.forEach(view => {
        const ua = view.userAgent.toLowerCase();
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

// 🔧 Complete Fix for the Monthly Report Error

// Get client IP address
function getClientIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null);
}

// Get location from IP using geoip-lite
async function getLocationFromIP(ip) {
    try {
        const geo = geoip.lookup(ip);
        return {
            country: geo?.country || 'Unknown',
            city: geo?.city || 'Unknown',
            region: geo?.region || 'Unknown'
        };
    } catch (error) {
        console.error('Geolocation error:', error);
        return { country: 'Unknown', city: 'Unknown', region: 'Unknown' };
    }
}

// Load data for a specific date
async function loadDateData(dateString) {
    try {
        const filePath = path.join(DATA_DIR, `analytics-${dateString}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

// Get last 30 days of data
async function getLast30DaysData() {
    const data = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const dayData = await loadDateData(dateString);
        if (dayData) {
            data.push(dayData);
        }
    }
    
    return data;
}

// Generate monthly traffic report
async function generateMonthlyReport() {
    const last30Days = await getLast30DaysData();
    
    if (last30Days.length === 0) {
        return {
            error: 'No data available for the last 30 days',
            period: '30 days',
            generatedAt: new Date().toISOString()
        };
    }
    
    // Aggregate data
    const uniqueVisitors = new Set();
    let totalPageViews = 0;
    const countries = {};
    const pages = {};
    const dramas = {};
    let totalVideoPlays = 0;
    let totalSearches = 0;
    const dailyStats = [];
    
    last30Days.forEach(dayData => {
        // Daily summary
        dailyStats.push({
            date: dayData.date,
            pageViews: dayData.pageViews.length,
            uniqueVisitors: dayData.summary.uniqueVisitors,
            videoPlays: dayData.summary.totalVideoPlays
        });
        
        // Unique visitors (across all days)
        Object.values(dayData.sessions).forEach(session => {
            uniqueVisitors.add(session.userId);
        });
        
        // Page views and countries
        dayData.pageViews.forEach(pv => {
            totalPageViews++;
            
            // Count countries
            const country = pv.country || 'Unknown';
            countries[country] = (countries[country] || 0) + 1;
            
            // Count pages
            const page = pv.url || 'Unknown';
            pages[page] = (pages[page] || 0) + 1;
        });
        
        // Video events (dramas)
        dayData.videoEvents.forEach(ve => {
            if (ve.eventType === 'play') {
                totalVideoPlays++;
                const dramaKey = ve.videoId;
                if (!dramas[dramaKey]) {
                    dramas[dramaKey] = {
                        id: ve.videoId,
                        title: ve.videoTitle,
                        plays: 0,
                        totalWatchTime: 0
                    };
                }
                dramas[dramaKey].plays++;
            }
        });
        
        // Search queries
        totalSearches += dayData.searchQueries.length;
    });
    
    // Sort and format results
    const topCountries = Object.entries(countries)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([country, visits]) => ({ country, visits, percentage: ((visits / totalPageViews) * 100).toFixed(1) }));
    
    const topPages = Object.entries(pages)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([page, visits]) => ({ page, visits, percentage: ((visits / totalPageViews) * 100).toFixed(1) }));
    
    const topDramas = Object.values(dramas)
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 10)
        .map(drama => ({
            ...drama,
            percentage: ((drama.plays / totalVideoPlays) * 100).toFixed(1)
        }));
    
    return {
        period: 'Last 30 days',
        generatedAt: new Date().toISOString(),
        summary: {
            totalUniqueVisitors: uniqueVisitors.size,
            totalPageViews,
            totalVideoPlays,
            totalSearches,
            averageDailyVisitors: Math.round(uniqueVisitors.size / Math.min(30, last30Days.length)),
            averageDailyPageViews: Math.round(totalPageViews / last30Days.length)
        },
        topCountries,
        topPages,
        topDramas,
        dailyBreakdown: dailyStats.reverse() // Most recent first
    };
}

// Serve analytics dashboard
app.get('/analytics', (req, res) => {
    res.sendFile(path.join(__dirname, 'analytics-dashboard.html'));
});

// Monthly report endpoint
app.get('/api/analytics/monthly-report', async (req, res) => {
    try {
        const report = await generateMonthlyReport();
        res.json(report);
    } catch (error) {
        console.error('Error generating monthly report:', error);
        res.status(500).json({ error: 'Failed to generate monthly report' });
    }
});

// Start server
ensureDataDir().then(() => {
    app.listen(PORT, () => {
        console.log(`Analytics API server running on port ${PORT}`);
        console.log(`Dashboard available at: http://localhost:${PORT}/analytics`);
    });
});

module.exports = app;