// Theme Switcher Functionality
function initThemeSwitcher() {
    const root = document.documentElement;
    const themeToggle = document.getElementById('theme-toggle');
    const logoSvg = document.getElementById('logo-svg');
    
    // Check for saved theme preference or use default dark theme
    const savedTheme = localStorage.getItem('dramatize-theme') || 'dark';
    setTheme(savedTheme);
    
    // Toggle theme when button is clicked
    themeToggle.addEventListener('click', () => {
        const currentTheme = root.classList.contains('dark-theme') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('dramatize-theme', newTheme);
    });
    
    // Function to set theme
    function setTheme(theme) {
        if (theme === 'dark') {
            root.classList.add('dark-theme');
            root.classList.remove('light-theme');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            if (logoSvg) {
                const darkElements = logoSvg.querySelectorAll('.dark-theme');
                const lightElements = logoSvg.querySelectorAll('.light-theme');
                darkElements.forEach(el => el.style.display = 'block');
                lightElements.forEach(el => el.style.display = 'none');
            }
        } else {
            root.classList.add('light-theme');
            root.classList.remove('dark-theme');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            if (logoSvg) {
                const darkElements = logoSvg.querySelectorAll('.dark-theme');
                const lightElements = logoSvg.querySelectorAll('.light-theme');
                darkElements.forEach(el => el.style.display = 'none');
                lightElements.forEach(el => el.style.display = 'block');
            }
        }
    }
}

// Carousel Functionality
function initCarousel() {
    const carousel = document.querySelector('.carousel');
    if (!carousel) return;
    
    const carouselInner = carousel.querySelector('.carousel-inner');
    const carouselItems = carousel.querySelectorAll('.carousel-item');
    const indicatorContainer = carousel.querySelector('.carousel-indicators');
    const totalItems = carouselItems.length;
    let currentIndex = 0;
    let interval;
    
    // Create indicators if they don't exist
    if (!indicatorContainer.children.length) {
        for (let i = 0; i < totalItems; i++) {
            const indicator = document.createElement('button');
            indicator.classList.add('carousel-indicator');
            indicator.setAttribute('aria-label', `Slide ${i + 1}`);
            indicator.addEventListener('click', () => goToSlide(i));
            indicatorContainer.appendChild(indicator);
        }
    }
    
    const indicators = indicatorContainer.querySelectorAll('.carousel-indicator');
    
    // Function to go to a specific slide
    function goToSlide(index) {
        currentIndex = index;
        carouselInner.style.transform = `translateX(-${currentIndex * 100}%)`;
        
        // Update indicators
        indicators.forEach((indicator, i) => {
            if (i === currentIndex) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });
    }
    
    // Function to go to the next slide
    function nextSlide() {
        currentIndex = (currentIndex + 1) % totalItems;
        goToSlide(currentIndex);
    }
    
    // Start automatic sliding
    function startAutoSlide() {
        interval = setInterval(nextSlide, 5000);
    }
    
    // Stop automatic sliding
    function stopAutoSlide() {
        clearInterval(interval);
    }
    
    // Initialize the carousel
    goToSlide(0);
    startAutoSlide();
    
    // Pause on hover
    carousel.addEventListener('mouseenter', stopAutoSlide);
    carousel.addEventListener('mouseleave', startAutoSlide);
}

// Search functionality is now handled in index.html
// Removed duplicate search implementation

// Video Player Controls
function initVideoPlayer() {
    const videoPlayer = document.querySelector('.video-player');
    if (!videoPlayer) return;
    
    const video = videoPlayer.querySelector('video');
    const playPauseBtn = videoPlayer.querySelector('.play-pause-btn');
    const progressBar = videoPlayer.querySelector('.progress-bar');
    const progressFill = videoPlayer.querySelector('.progress-fill');
    const timeDisplay = videoPlayer.querySelector('.time-display');
    const volumeControl = videoPlayer.querySelector('.volume-control');
    const skipBackBtn = videoPlayer.querySelector('.skip-back-btn');
    const skipForwardBtn = videoPlayer.querySelector('.skip-forward-btn');
    const qualitySelector = videoPlayer.querySelector('.quality-selector');
    const playbackRateSelector = videoPlayer.querySelector('.playback-rate-selector');
    const lockBtn = videoPlayer.querySelector('.lock-btn');
    const controls = videoPlayer.querySelector('.video-controls');
    
    let isLocked = false;
    
    // Play/Pause
    playPauseBtn.addEventListener('click', () => {
        if (video.paused) {
            video.play();
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            video.pause();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    });
    
    // Update progress bar
    video.addEventListener('timeupdate', () => {
        const progress = (video.currentTime / video.duration) * 100;
        progressFill.style.width = `${progress}%`;
        
        // Update time display
        const currentMinutes = Math.floor(video.currentTime / 60);
        const currentSeconds = Math.floor(video.currentTime % 60);
        const durationMinutes = Math.floor(video.duration / 60);
        const durationSeconds = Math.floor(video.duration % 60);
        
        timeDisplay.textContent = `${currentMinutes}:${currentSeconds < 10 ? '0' : ''}${currentSeconds} / ${durationMinutes}:${durationSeconds < 10 ? '0' : ''}${durationSeconds}`;
    });
    
    // Seek on progress bar click
    progressBar.addEventListener('click', (e) => {
        if (isLocked) return;
        
        const rect = progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        video.currentTime = pos * video.duration;
    });
    
    // Volume control
    volumeControl.addEventListener('input', () => {
        if (isLocked) return;
        video.volume = volumeControl.value;
    });
    
    // Skip backward/forward
    skipBackBtn.addEventListener('click', () => {
        if (isLocked) return;
        video.currentTime -= 10;
    });
    
    skipForwardBtn.addEventListener('click', () => {
        if (isLocked) return;
        video.currentTime += 10;
    });
    
    // Quality selection
    if (qualitySelector) {
        qualitySelector.addEventListener('change', () => {
            if (isLocked) return;
            // In a real app, this would change the video source
            console.log(`Quality changed to ${qualitySelector.value}`);
        });
    }
    
    // Playback rate
    if (playbackRateSelector) {
        playbackRateSelector.addEventListener('change', () => {
            if (isLocked) return;
            video.playbackRate = parseFloat(playbackRateSelector.value);
        });
    }
    
    // Lock/unlock controls
    lockBtn.addEventListener('click', () => {
        isLocked = !isLocked;
        lockBtn.innerHTML = isLocked ? 
            '<i class="fas fa-lock"></i>' : 
            '<i class="fas fa-lock-open"></i>';
        
        if (isLocked) {
            controls.classList.add('locked');
        } else {
            controls.classList.remove('locked');
        }
    });
    
    // Show/hide controls on hover
    videoPlayer.addEventListener('mouseenter', () => {
        if (!isLocked) {
            controls.classList.add('visible');
        }
    });
    
    videoPlayer.addEventListener('mouseleave', () => {
        if (!isLocked) {
            controls.classList.remove('visible');
        }
    });
    
    // Add this inside the initVideoPlayer function, after the existing event listeners
    
    // Keyboard shortcuts for video player
    document.addEventListener('keydown', (e) => {
        // Only work when video player is visible and not locked
        const videoContainer = document.getElementById('videoPlayerContainer');
        if (!videoContainer || videoContainer.style.display === 'none' || isLocked) return;
        
        switch(e.code) {
            case 'ArrowLeft':
                e.preventDefault();
                video.currentTime -= 10; // Skip back 10 seconds
                break;
            case 'ArrowRight':
                e.preventDefault();
                video.currentTime += 10; // Skip forward 10 seconds
                break;
            case 'Space':
                e.preventDefault();
                if (video.paused) {
                    video.play();
                    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                } else {
                    video.pause();
                    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                }
                break;
            case 'KeyM':
                e.preventDefault();
                video.muted = !video.muted;
                break;
            case 'KeyF':
                e.preventDefault();
                if (video.requestFullscreen) {
                    video.requestFullscreen();
                }
                break;
        }
    });
}

// User Authentication (Mock)
function initAuth() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const userMenu = document.getElementById('user-menu');
    const continueWatchingSection = document.getElementById('continue-watching');
    
    // Check if user is already logged in
    const isLoggedIn = localStorage.getItem('dramatize-user');
    
    if (isLoggedIn) {
        if (userMenu) userMenu.classList.remove('hidden');
        if (loginBtn) loginBtn.classList.add('hidden');
    } else {
        if (userMenu) userMenu.classList.add('hidden');
        if (loginBtn) loginBtn.classList.remove('hidden');
    }
    
    // Always show continue watching section (login only required for favorites)
    if (continueWatchingSection) continueWatchingSection.classList.remove('hidden');
    
    // Login button click
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            loginModal.classList.remove('hidden');
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.classList.add('hidden');
        }
    });
    
    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;
            
            // Mock login - in a real app, this would validate against a backend
            localStorage.setItem('dramatize-user', JSON.stringify({ email }));
            
            // Update UI
            if (userMenu) userMenu.classList.remove('hidden');
            if (loginBtn) loginBtn.classList.add('hidden');
            if (continueWatchingSection) continueWatchingSection.classList.remove('hidden');
            
            // Close modal
            loginModal.classList.add('hidden');
        });
    }
    
    // Logout button click
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('dramatize-user');
            
            // Update UI
            if (userMenu) userMenu.classList.add('hidden');
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (continueWatchingSection) continueWatchingSection.classList.add('hidden');
        });
    }
}

// Initialize all components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initThemeSwitcher();
    initCarousel();
    initVideoPlayer();
    initAuth();
});

// Add user login requirement for continue watching
function requireLoginForContinueWatching() {
    const user = localStorage.getItem('dramatize-user');
    if (!user) {
        showLoginModal();
        return false;
    }
    return true;
}

// Update continue watching to require login
function updateContinueWatching(dramaId, episode, time) {
    if (!requireLoginForContinueWatching()) return;
    
    const user = JSON.parse(localStorage.getItem('dramatize-user'));
    // Save continue watching data with user association
}

// Add to favorites functionality
function toggleFavorite(dramaId) {
    const user = JSON.parse(localStorage.getItem('dramatize-user'));
    if (!user) {
        showLoginModal();
        return;
    }
    
    let favorites = JSON.parse(localStorage.getItem('user-favorites')) || [];
    const index = favorites.indexOf(dramaId);
    
    if (index > -1) {
        favorites.splice(index, 1); // Remove from favorites
    } else {
        favorites.push(dramaId); // Add to favorites
    }
    
    localStorage.setItem('user-favorites', JSON.stringify(favorites));
    updateFavoriteUI(dramaId);
}

// Episode selection functionality
function openVideoPlayer(videoUrl, title, dramaId) {
    // Load episode list
    loadEpisodeList(dramaId);
}

function loadEpisodeList(dramaId) {
    const drama = findDramaById(dramaId);
    const episodeList = document.getElementById('episodeList');
    
    if (drama && drama.episodes) {
        episodeList.innerHTML = '';
        for (let i = 1; i <= drama.episodes; i++) {
            const episodeBtn = document.createElement('button');
            episodeBtn.className = 'episode-btn';
            episodeBtn.textContent = `Episode ${i}`;
            episodeBtn.onclick = () => playEpisode(dramaId, i);
            episodeList.appendChild(episodeBtn);
        }
    }
}

function playEpisode(dramaId, episodeNumber) {
    // Update video source for selected episode
    const video = document.getElementById('mainVideo');
    const episodeUrl = getEpisodeUrl(dramaId, episodeNumber);
    video.src = episodeUrl;
    video.play();
}