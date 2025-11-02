// Dramatize Analytics - Frontend Tracking Script
// Privacy-focused, lightweight analytics for video streaming platform

class DramatizeAnalytics {
    constructor(config = {}) {
        this.apiEndpoint = config.apiEndpoint || 'http://localhost:3002/api/analytics';
        this.sessionId = this.generateSessionId();
        this.userId = this.getUserId();
        this.startTime = Date.now();
        this.lastActivity = Date.now();
        this.pageViews = [];
        this.videoEvents = [];
        this.searchQueries = [];
        
        this.init();
    }

    init() {
        // Track page load
        this.trackPageView();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Send data periodically
        setInterval(() => this.sendBatch(), 30000); // Every 30 seconds
        
        // Send data before page unload
        window.addEventListener('beforeunload', () => this.sendBatch());
        
        // Track user activity
        this.trackUserActivity();
    }

    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getUserId() {
        let userId = localStorage.getItem('dramatize_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('dramatize_user_id', userId);
        }
        return userId;
    }

    hashIP() {
        // Simple hash function for IP privacy
        return btoa(navigator.userAgent + navigator.language).substr(0, 16);
    }

    trackPageView() {
        const pageData = {
            type: 'pageview',
            timestamp: Date.now(),
            url: window.location.pathname,
            title: document.title,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`,
            sessionId: this.sessionId,
            userId: this.userId,
            ipHash: this.hashIP()
        };
        
        this.pageViews.push(pageData);
    }

    // Enhanced video tracking for dramas
    trackVideoEvent(eventType, videoData) {
        const event = {
            type: 'video',
            eventType: eventType,
            timestamp: Date.now(),
            videoId: videoData.id,
            videoTitle: videoData.title,
            dramaTitle: videoData.dramaTitle || videoData.title, // Add drama series name
            episode: videoData.episode || 1,
            season: videoData.season || 1,
            currentTime: videoData.currentTime || 0,
            duration: videoData.duration || 0,
            quality: videoData.quality || 'auto',
            sessionId: this.sessionId,
            userId: this.userId
        };
        
        this.videoEvents.push(event);
    }

    trackSearch(query, results = 0) {
        const searchData = {
            type: 'search',
            timestamp: Date.now(),
            query: query,
            resultsCount: results,
            sessionId: this.sessionId,
            userId: this.userId
        };
        
        this.searchQueries.push(searchData);
    }

    trackFavorite(contentId, action) {
        const favoriteData = {
            type: 'favorite',
            timestamp: Date.now(),
            contentId: contentId,
            action: action, // 'add' or 'remove'
            sessionId: this.sessionId,
            userId: this.userId
        };
        
        this.sendEvent(favoriteData);
    }

    trackContinueWatching(contentId, progress) {
        const continueData = {
            type: 'continue',
            timestamp: Date.now(),
            contentId: contentId,
            progress: progress,
            sessionId: this.sessionId,
            userId: this.userId
        };
        
        this.sendEvent(continueData);
    }

    setupEventListeners() {
        // Track video events
        document.addEventListener('play', (e) => {
            if (e.target.tagName === 'VIDEO') {
                this.trackVideoEvent('play', {
                    id: e.target.dataset.videoId || 'unknown',
                    title: e.target.dataset.videoTitle || 'Unknown Video',
                    currentTime: e.target.currentTime,
                    duration: e.target.duration
                });
            }
        }, true);

        document.addEventListener('pause', (e) => {
            if (e.target.tagName === 'VIDEO') {
                this.trackVideoEvent('pause', {
                    id: e.target.dataset.videoId || 'unknown',
                    title: e.target.dataset.videoTitle || 'Unknown Video',
                    currentTime: e.target.currentTime,
                    duration: e.target.duration
                });
            }
        }, true);

        document.addEventListener('ended', (e) => {
            if (e.target.tagName === 'VIDEO') {
                this.trackVideoEvent('ended', {
                    id: e.target.dataset.videoId || 'unknown',
                    title: e.target.dataset.videoTitle || 'Unknown Video',
                    currentTime: e.target.currentTime,
                    duration: e.target.duration
                });
            }
        }, true);

        // Track search events
        document.addEventListener('submit', (e) => {
            const form = e.target;
            const searchInput = form.querySelector('input[type="search"], input[name="search"], .search-input');
            if (searchInput && searchInput.value) {
                this.trackSearch(searchInput.value);
            }
        });

        // Track clicks on content
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-content-id]');
            if (target) {
                this.trackContentClick(target.dataset.contentId, target.dataset.contentType || 'unknown');
            }
        });
    }

    trackContentClick(contentId, contentType) {
        const clickData = {
            type: 'content_click',
            timestamp: Date.now(),
            contentId: contentId,
            contentType: contentType,
            sessionId: this.sessionId,
            userId: this.userId
        };
        
        this.sendEvent(clickData);
    }

    trackUserActivity() {
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => {
                this.lastActivity = Date.now();
            }, true);
        });
    }

    getSessionDuration() {
        return Date.now() - this.startTime;
    }

    sendEvent(eventData) {
        fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData)
        }).catch(err => {
            console.warn('Analytics event failed to send:', err);
        });
    }

    sendBatch() {
        if (this.pageViews.length === 0 && this.videoEvents.length === 0 && this.searchQueries.length === 0) {
            return;
        }

        const batchData = {
            type: 'batch',
            timestamp: Date.now(),
            sessionId: this.sessionId,
            userId: this.userId,
            sessionDuration: this.getSessionDuration(),
            lastActivity: this.lastActivity,
            pageViews: [...this.pageViews],
            videoEvents: [...this.videoEvents],
            searchQueries: [...this.searchQueries]
        };

        fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(batchData)
        }).then(() => {
            // Clear sent data
            this.pageViews = [];
            this.videoEvents = [];
            this.searchQueries = [];
        }).catch(err => {
            console.warn('Analytics batch failed to send:', err);
        });
    }
}

// Auto-initialize analytics
window.dramatizeAnalytics = new DramatizeAnalytics();

// Global functions for manual tracking
window.trackVideoPlay = (videoId, title) => {
    window.dramatizeAnalytics.trackVideoEvent('play', { id: videoId, title: title });
};

window.trackSearch = (query, results) => {
    window.dramatizeAnalytics.trackSearch(query, results);
};

window.trackFavorite = (contentId, action) => {
    window.dramatizeAnalytics.trackFavorite(contentId, action);
};

window.trackContinueWatching = (contentId, progress) => {
    window.dramatizeAnalytics.trackContinueWatching(contentId, progress);
};