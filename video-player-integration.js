// Integration with existing drama website
class DramaVideoPlayer {
    constructor() {
        this.currentPlayer = null;
        this.init();
    }

    init() {
        // Initialize secure video player when needed
        // Temporarily disabled to prevent loading conflicts
        // this.setupVideoPlayerTriggers();
        this.setupGlobalProtection();
    }

    setupVideoPlayerTriggers() {
        // Enhanced security for video playback
        // Listen for video play requests
        document.addEventListener('click', (e) => {
            // Check for new data-video-id system
            const playButton = e.target.closest('[data-video-id]');
            if (playButton) {
                e.preventDefault();
                const videoId = playButton.dataset.videoId;
                const episodeTitle = playButton.dataset.episodeTitle || 'Episode';
                this.playSecureVideo(videoId, episodeTitle);
                return;
            }
            
            // Check for old onclick system
            const dramaCard = e.target.closest('.drama-card');
            if (dramaCard && dramaCard.onclick) {
                e.preventDefault();
                // Extract drama ID from onclick function
                const onclickStr = dramaCard.getAttribute('onclick');
                const match = onclickStr.match(/openVideoPlayerEnhanced\('([^']+)'/);
                if (match) {
                    const videoId = match[1];
                    const title = dramaCard.querySelector('.drama-title')?.textContent || 'Episode';
                    this.playSecureVideo(videoId, title);
                }
            }
        });
    }

    async playSecureVideo(videoId, title) {
        try {
            // Show loading state
            this.showVideoModal(title, true);

            // Get user info
            const userId = this.getCurrentUserId();
            const userEmail = this.getCurrentUserEmail();

            // Create secure player
            this.currentPlayer = new SecureVideoPlayer('video-player-container', {
                enableWatermark: true,
                watermarkText: userEmail || 'Dramatize Viewer',
                tokenRefreshInterval: 1800000 // 30 minutes
            });

            // Load video
            await this.currentPlayer.loadVideo(videoId, userId);

            // Hide loading state
            this.hideVideoLoading();

        } catch (error) {
            console.error('Failed to play video:', error);
            this.showVideoError('Failed to load video. Please try again.');
        }
    }

    showVideoModal(title, loading = false) {
        const modal = document.createElement('div');
        modal.id = 'video-modal';
        modal.innerHTML = `
            <div class="video-modal-overlay">
                <div class="video-modal-content">
                    <div class="video-modal-header">
                        <h3>${title}</h3>
                        <button class="video-modal-close">&times;</button>
                    </div>
                    <div class="video-modal-body">
                        ${loading ? '<div class="video-loading">Loading secure video...</div>' : ''}
                        <div id="video-player-container"></div>
                    </div>
                </div>
            </div>
        `;

        // Add modal styles
        const style = document.createElement('style');
        style.textContent = `
            .video-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .video-modal-content {
                background: #000;
                border-radius: 8px;
                width: 90%;
                max-width: 1200px;
                max-height: 90%;
                overflow: hidden;
            }
            
            .video-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                background: #1a1a1a;
                color: white;
            }
            
            .video-modal-close {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
            }
            
            .video-modal-body {
                padding: 0;
                position: relative;
            }
            
            .video-loading {
                text-align: center;
                padding: 50px;
                color: white;
                font-size: 18px;
            }
            
            #video-player-container {
                width: 100%;
                height: 0;
                padding-bottom: 56.25%; /* 16:9 aspect ratio */
                position: relative;
            }
            
            #video-player-container .video-js {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            }
        `;
        
        if (!document.querySelector('style[data-video-modal]')) {
            style.setAttribute('data-video-modal', 'true');
            document.head.appendChild(style);
        }

        document.body.appendChild(modal);

        // Setup close handlers
        modal.querySelector('.video-modal-close').addEventListener('click', () => {
            this.closeVideoModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeVideoModal();
            }
        });
    }

    hideVideoLoading() {
        const loading = document.querySelector('.video-loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    showVideoError(message) {
        const container = document.getElementById('video-player-container');
        if (container) {
            container.innerHTML = `
                <div class="video-error">
                    <p>${message}</p>
                    <button onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }

    closeVideoModal() {
        if (this.currentPlayer) {
            this.currentPlayer.destroy();
            this.currentPlayer = null;
        }

        const modal = document.getElementById('video-modal');
        if (modal) {
            modal.remove();
        }
    }

    setupGlobalProtection() {
        // Gentle protection that doesn't interfere with normal browsing
        let devToolsOpen = false;
        
        // Detect dev tools (basic detection)
        setInterval(() => {
            const threshold = 160;
            if (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold) {
                if (!devToolsOpen) {
                    devToolsOpen = true;
                    this.handleDevToolsDetection();
                }
            } else {
                devToolsOpen = false;
            }
        }, 500);
    }

    handleDevToolsDetection() {
        // Gentle warning instead of blocking
        if (this.currentPlayer) {
            this.currentPlayer.showToast('Developer tools detected. Video quality may be affected.');
        }
    }

    getCurrentUserId() {
        // Get from your authentication system
        return localStorage.getItem('userId') || 'anonymous';
    }

    getCurrentUserEmail() {
        // Get from your authentication system
        return localStorage.getItem('userEmail') || '';
    }
}

// Initialize when DOM is ready
// Temporarily disabled to prevent video player conflicts
// document.addEventListener('DOMContentLoaded', () => {
//     new DramaVideoPlayer();
// });