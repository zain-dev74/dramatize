class SecureVideoPlayer {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.player = null;
        this.options = {
            watermarkText: options.watermarkText || '',
            enableWatermark: options.enableWatermark || false,
            tokenRefreshInterval: options.tokenRefreshInterval || 1800000, // 30 minutes
            ...options
        };
        this.tokenRefreshTimer = null;
        this.init();
    }

    async init() {
        // Load Video.js and HLS plugin
        await this.loadDependencies();
        this.createPlayer();
        this.setupSecurity();
        if (this.options.enableWatermark) {
            this.addWatermark();
        }
    }

    async loadDependencies() {
        // Load Video.js CSS and JS
        if (!document.querySelector('link[href*="video-js.css"]')) {
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = 'https://vjs.zencdn.net/8.6.1/video-js.css';
            document.head.appendChild(css);
        }

        if (!window.videojs) {
            const script = document.createElement('script');
            script.src = 'https://vjs.zencdn.net/8.6.1/video.min.js';
            await new Promise(resolve => {
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }

        // Load HLS.js for browsers without native HLS support
        if (!window.Hls && !this.isHLSSupported()) {
            const hlsScript = document.createElement('script');
            hlsScript.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
            await new Promise(resolve => {
                hlsScript.onload = resolve;
                document.head.appendChild(hlsScript);
            });
        }
    }

    createPlayer() {
        const container = document.getElementById(this.containerId);
        
        // Create video element
        const videoElement = document.createElement('video-js');
        videoElement.className = 'vjs-default-skin secure-video-player';
        videoElement.setAttribute('controls', 'true');
        videoElement.setAttribute('preload', 'auto');
        videoElement.setAttribute('data-setup', '{}');
        videoElement.setAttribute('controlsList', 'nodownload');
        videoElement.setAttribute('disablePictureInPicture', 'true');
        
        container.appendChild(videoElement);

        // Initialize Video.js player
        this.player = videojs(videoElement, {
            fluid: true,
            responsive: true,
            playbackRates: [0.5, 1, 1.25, 1.5, 2],
            controls: true,
            html5: {
                vhs: {
                    overrideNative: true
                },
                nativeVideoTracks: false,
                nativeAudioTracks: false,
                nativeTextTracks: false
            }
        });

        // Setup HLS.js fallback for non-native browsers
        if (!this.isHLSSupported() && window.Hls) {
            this.setupHlsJsFallback();
        }
    }

    setupHlsJsFallback() {
        this.player.ready(() => {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 90
            });
            
            hls.attachMedia(this.player.tech().el());
            
            this.player.hls = hls;
        });
    }

    async loadVideo(videoId, userId) {
        try {
            // Get secure streaming URL from backend
            const streamData = await this.getSecureStreamUrl(videoId, userId);
            
            if (this.player.hls) {
                // Use HLS.js
                this.player.hls.loadSource(streamData.streamUrl);
            } else {
                // Use native HLS or Video.js VHS
                this.player.src({
                    src: streamData.streamUrl,
                    type: 'application/x-mpegURL'
                });
            }

            // Setup token refresh
            this.setupTokenRefresh(videoId, userId, streamData.expiresIn);
            
        } catch (error) {
            console.error('Failed to load secure video:', error);
            this.showError('Failed to load video. Please try again.');
        }
    }

    async getSecureStreamUrl(videoId, userId) {
        const response = await fetch('/api/video/secure-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getAuthToken()}`
            },
            body: JSON.stringify({ videoId, userId })
        });

        if (!response.ok) {
            throw new Error('Failed to get secure stream URL');
        }

        return await response.json();
    }

    setupTokenRefresh(videoId, userId, expiresIn) {
        // Clear existing timer
        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
        }

        // Set refresh timer for 5 minutes before expiry
        const refreshTime = (expiresIn - 300) * 1000;
        
        this.tokenRefreshTimer = setTimeout(async () => {
            try {
                const newStreamData = await this.getSecureStreamUrl(videoId, userId);
                // Seamlessly update the source without interrupting playback
                this.updateStreamUrl(newStreamData.streamUrl);
                this.setupTokenRefresh(videoId, userId, newStreamData.expiresIn);
            } catch (error) {
                console.error('Token refresh failed:', error);
            }
        }, refreshTime);
    }

    updateStreamUrl(newUrl) {
        if (this.player.hls) {
            this.player.hls.loadSource(newUrl);
        } else {
            // For native HLS, we need to be more careful to avoid interruption
            const currentTime = this.player.currentTime();
            this.player.src({ src: newUrl, type: 'application/x-mpegURL' });
            this.player.currentTime(currentTime);
        }
    }

    setupSecurity() {
        // Disable right-click on video player only
        this.player.ready(() => {
            const videoElement = this.player.el();
            
            videoElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                return false;
            });

            // Disable drag and drop
            videoElement.addEventListener('dragstart', (e) => {
                e.preventDefault();
                return false;
            });

            // Disable text selection on video
            videoElement.style.userSelect = 'none';
            videoElement.style.webkitUserSelect = 'none';
        });

        // Setup keyboard restrictions (gentle approach)
        this.setupKeyboardRestrictions();
    }

    setupKeyboardRestrictions() {
        document.addEventListener('keydown', (e) => {
            // Block common download/save shortcuts
            if ((e.ctrlKey && ['s', 'u'].includes(e.key.toLowerCase())) ||
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') ||
                (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c')) {
                
                // Only block if focus is on video or video container
                const activeElement = document.activeElement;
                const videoContainer = document.getElementById(this.containerId);
                
                if (videoContainer && (videoContainer.contains(activeElement) || 
                    activeElement === videoContainer)) {
                    e.preventDefault();
                    this.showToast('This action is not allowed during video playback');
                }
            }
        });
    }

    addWatermark() {
        if (!this.options.watermarkText) return;

        this.player.ready(() => {
            const watermark = document.createElement('div');
            watermark.className = 'video-watermark';
            watermark.textContent = this.options.watermarkText;
            
            // Add CSS for watermark
            const style = document.createElement('style');
            style.textContent = `
                .video-watermark {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    color: rgba(255, 255, 255, 0.3);
                    font-size: 14px;
                    font-family: Arial, sans-serif;
                    pointer-events: none;
                    z-index: 1000;
                    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
                    transition: opacity 2s ease-in-out;
                }
                
                .video-watermark.fade {
                    opacity: 0.1;
                }
            `;
            document.head.appendChild(style);
            
            this.player.el().appendChild(watermark);
            
            // Animate watermark opacity
            setInterval(() => {
                watermark.classList.toggle('fade');
            }, 10000);
        });
    }

    showError(message) {
        if (this.player) {
            this.player.error({ code: 4, message });
        }
    }

    showToast(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = 'security-toast';
        toast.textContent = message;
        
        const style = document.createElement('style');
        style.textContent = `
            .security-toast {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                z-index: 10000;
                font-size: 14px;
                animation: slideIn 0.3s ease-out;
            }
            
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        
        if (!document.querySelector('style[data-security-toast]')) {
            style.setAttribute('data-security-toast', 'true');
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    isHLSSupported() {
        const video = document.createElement('video');
        return video.canPlayType('application/vnd.apple.mpegurl') !== '';
    }

    getAuthToken() {
        // Get authentication token from localStorage or session
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    destroy() {
        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
        }
        
        if (this.player) {
            this.player.dispose();
        }
    }
}

// Export for use
window.SecureVideoPlayer = SecureVideoPlayer;