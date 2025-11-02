class AdminPanel {
    constructor() {
        this.apiBase = window.location.protocol + '//' + window.location.host + '/api';
        this.currentUser = null;
        this.dramas = {
            korean: [],
            chinese: [],
            explanation: []
        };
        this.editingId = null;
        this.editingCategory = null;
        
        this.init();
    }

    init() {
 
        const token = localStorage.getItem('adminToken');
        if (token && this.isOnDashboard()) {
            this.validateToken(token);
        } else if (this.isOnDashboard()) {
            this.redirectToLogin();
        }

        this.setupEventListeners();
    }

    isOnDashboard() {
        return window.location.pathname.includes('dashboard.html');
    }

    setupEventListeners() {
   
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

      
        const dramaForm = document.getElementById('dramaForm');
        if (dramaForm) {
            dramaForm.addEventListener('submit', (e) => this.handleDramaSubmit(e));
        }

       
        const thumbnailInput = document.getElementById('thumbnail');
        if (thumbnailInput) {
            thumbnailInput.addEventListener('change', (e) => this.previewImage(e));
        }

       
        const videoFileInput = document.getElementById('videoFile');
        if (videoFileInput) {
            videoFileInput.addEventListener('change', (e) => this.validateVideoFile(e));
        }

     
        const episodeForm = document.getElementById('episodeForm');
        if (episodeForm) {
            episodeForm.addEventListener('submit', (e) => this.handleEpisodeSubmit(e));
        }

      
        const episodeVideoInput = document.getElementById('episodeVideoFile');
        if (episodeVideoInput) {
            episodeVideoInput.addEventListener('change', (e) => this.validateVideoFile(e));
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('message');
        const loginBtn = document.querySelector('.login-btn');
        
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        errorDiv.textContent = '';
        
        try {
            const response = await fetch(`${this.apiBase}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('adminToken', data.token);
                loginBtn.textContent = 'Success! Redirecting...';
                window.location.href = 'dashboard.html';
            } else {
                errorDiv.textContent = data.message || 'Invalid credentials';
            }
        } catch (error) {
            errorDiv.textContent = 'Connection error. Please try again.';
        } finally {
            if (loginBtn.textContent !== 'Success! Redirecting...') {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Login';
            }
        }
    }

    // Remove lines 91-95 completely
    // Remove the simple-auth-token logic
    
    async validateToken(token) {
        try {
            const response = await fetch(`${this.apiBase}/validate`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.loadDashboard();
            } else {
                this.redirectToLogin();
            }
        } catch (error) {
            this.redirectToLogin();
        }
    }

    redirectToLogin() {
        localStorage.removeItem('adminToken');
        window.location.href = 'index.html';
    }

    // Episode Management Functions
    manageEpisodes(dramaId, category) {
        if (!this.dramas || !this.dramas[category]) {
            this.showMessage('Dramas not loaded. Please refresh the page.', 'error');
            return;
        }
        
        const drama = this.dramas[category].find(d => d.id === dramaId);
        
        if (!drama) {
            this.showMessage('Drama not found', 'error');
            return;
        }
        
        this.currentDrama = drama;
        this.currentCategory = category;
        document.getElementById('episodeModalTitle').textContent = `Manage Episodes - ${drama.title}`;
        this.loadEpisodes(drama);
        document.getElementById('episodeModal').classList.add('active');
    }

    loadEpisodes(drama) {
        const episodesList = document.getElementById('episodesList');
        
        // Check if episodes is an array (new format) or number/string (old format)
        if (!drama.episodes || (Array.isArray(drama.episodes) && drama.episodes.length === 0)) {
            episodesList.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">No episodes added yet. Click "Add Episode" to get started!</p>';
            return;
        }
        
        // Handle old format where episodes is just a number or string
        if (typeof drama.episodes === 'number' || typeof drama.episodes === 'string') {
            const episodeCount = typeof drama.episodes === 'string' ? parseInt(drama.episodes) || 0 : drama.episodes;
            episodesList.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;">This drama has ${episodeCount} episodes. Episode management is not yet configured for this drama. Click "Add Episode" to start adding individual episodes!</p>`;
            return;
        }
        
        // Handle new format where episodes is an array
        if (Array.isArray(drama.episodes)) {
            episodesList.innerHTML = drama.episodes.map(episode => `
                <div class="episode-item">
                    <div class="episode-info">
                        <h4>Episode ${episode.episode_number || episode.episodeNumber}: ${episode.title}</h4>
                        <p>${episode.description}</p>
                        <div class="episode-meta">
                            <span>Duration: ${episode.duration || episode.videoLength || 'undefined'}</span>
                            <span>Air Date: ${episode.air_date || episode.airDate || 'undefined'}</span>
                            <span class="status ${(episode.status === 'active' || episode.isAvailable) ? 'available' : 'unavailable'}">
                                ${(episode.status === 'active' || episode.isAvailable) ? 'Available' : 'Unavailable'}
                            </span>
                        </div>
                    </div>
                    <div class="episode-actions">
                        <button onclick="adminPanel.editEpisode('${episode.id}')" class="btn-edit">Edit</button>
                        <button onclick="adminPanel.deleteEpisode('${episode.id}')" class="btn-delete">Delete</button>
                    </div>
                </div>
            `).join('');
        }
    }

    openAddEpisodeModal() {
        document.getElementById('addEpisodeModalTitle').textContent = 'Add New Episode';
        document.getElementById('episodeForm').reset();
        document.getElementById('episodeId').value = '';
        
        // Set next episode number
        let nextEpisodeNumber = 1;
        if (this.currentDrama.episodes) {
            if (Array.isArray(this.currentDrama.episodes)) {
                nextEpisodeNumber = this.currentDrama.episodes.length + 1;
            } else if (typeof this.currentDrama.episodes === 'number') {
                nextEpisodeNumber = this.currentDrama.episodes + 1;
            }
        }
        document.getElementById('episodeNumber').value = nextEpisodeNumber;
        
        // Make video file required for new episodes
        const videoFileInput = document.getElementById('episodeVideoFile');
        if (videoFileInput) {
            videoFileInput.setAttribute('required', 'required');
        }
        
        document.getElementById('addEpisodeModal').classList.add('active');
    }

    editEpisode(episodeId) {
        // Check if episodes is an array before trying to find
        if (!Array.isArray(this.currentDrama.episodes)) {
            this.showMessage('Episode editing not available for this drama format', 'error');
            return;
        }
        
        const episode = this.currentDrama.episodes.find(ep => ep.id === episodeId);
        if (!episode) {
            this.showMessage('Episode not found', 'error');
            return;
        }
        
        document.getElementById('addEpisodeModalTitle').textContent = 'Edit Episode';
        document.getElementById('episodeId').value = episode.id;
        document.getElementById('episodeNumber').value = episode.episodeNumber;
        document.getElementById('episodeTitle').value = episode.title;
        document.getElementById('episodeDescription').value = episode.description;
        document.getElementById('episodeVideoLength').value = episode.videoLength;
        document.getElementById('episodeAirDate').value = episode.airDate;
        document.getElementById('episodeIsAvailable').checked = episode.isAvailable;
        
        // Make video file optional for editing
        const videoFileInput = document.getElementById('episodeVideoFile');
        if (videoFileInput) {
            videoFileInput.removeAttribute('required');
        }
        
        document.getElementById('addEpisodeModal').classList.add('active');
    }

    async deleteEpisode(episodeId) {
        if (!confirm('Are you sure you want to delete this episode?')) {
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/dramas/${this.currentCategory}/${this.currentDrama.id}/episodes/${episodeId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            if (response.ok) {
                this.showMessage('Episode deleted successfully', 'success');
                await this.loadDramas();
                this.loadEpisodes(this.currentDrama);
            } else {
                this.showMessage('Failed to delete episode', 'error');
            }
        } catch (error) {
            console.error('Delete episode error:', error);
            this.showMessage('Connection error', 'error');
        }
    }

    async handleEpisodeSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        
        const episodeNumber = formData.get('episodeNumber');
        const title = formData.get('episodeTitle');
        const description = formData.get('episodeDescription');
        const videoFile = formData.get('episodeVideoFile');
        const episodeId = formData.get('episodeId');
        

        
        if (!title || title.trim() === '') {
            this.showMessage('Please enter an episode title', 'error');
            return;
        }
        
        if (!episodeId && (!videoFile || videoFile.size === 0)) {
            this.showMessage('Please select a video file to upload', 'error');
            return;
        }
        
        // Video file validation
        if (videoFile && videoFile.size > 0) {
            const maxSize = 500 * 1024 * 1024; // 500MB
            const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
            
            if (videoFile.size > maxSize) {
                this.showMessage('Video file size must be less than 500MB', 'error');
                return;
            }
            
            if (!allowedTypes.includes(videoFile.type)) {
                this.showMessage('Please upload a valid video file (MP4, WebM, or OGG)', 'error');
                return;
            }
        }
        
        try {
            const method = episodeId ? 'PUT' : 'POST';
            const url = episodeId 
                ? `${this.apiBase}/dramas/${this.currentCategory}/${this.currentDrama.id}/episodes/${episodeId}`
                : `${this.apiBase}/dramas/${this.currentCategory}/${this.currentDrama.id}/episodes`;
            
            const response = await fetch(url, {
                method: method,
                body: formData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            if (response.ok) {
                this.showMessage(episodeId ? 'Episode updated successfully' : 'Episode added successfully', 'success');
                this.closeAddEpisodeModal();
                await this.loadDramas();
                // Reload the current drama with updated episode data
                const updatedDrama = this.dramas[this.currentCategory].find(d => d.id === this.currentDrama.id);
                if (updatedDrama) {
                    this.currentDrama = updatedDrama;
                    this.loadEpisodes(this.currentDrama);
                }
            } else {
                this.showMessage('Failed to save episode', 'error');
            }
        } catch (error) {
            console.error('Episode submit error:', error);
            this.showMessage('Connection error. Please check your network and try again.', 'error');
        }
    }

    closeEpisodeModal() {
        document.getElementById('episodeModal').classList.remove('active');
        this.currentDrama = null;
        this.currentCategory = null;
    }

    closeAddEpisodeModal() {
        document.getElementById('addEpisodeModal').classList.remove('active');
    }

    async loadDashboard() {
        await this.loadDramas();
        this.updateStats();
        this.renderDramas();
    }

    async loadDramas() {
        try {
            const response = await fetch(`${this.apiBase}/dramas`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            if (response.ok) {
                this.dramas = await response.json();
            }
        } catch (error) {
            console.error('Failed to load dramas:', error);
            // Initialize empty dramas when API is not available
            this.dramas = {
                korean: [],
                chinese: [],
                explanation: []
            };
        }
        
        // Update homepage UI after loading dramas
        if (typeof populateHighlightSelects === 'function') {
            populateHighlightSelects();
        }
        if (typeof loadFeaturedContent === 'function') {
            loadFeaturedContent();
        }
    }

    updateStats() {
        const totalDramas = this.dramas.korean.length + this.dramas.chinese.length + this.dramas.explanation.length;
        
        document.getElementById('totalDramas').textContent = totalDramas;
        document.getElementById('koreanDramas').textContent = this.dramas.korean.length;
        document.getElementById('chineseDramas').textContent = this.dramas.chinese.length;
        document.getElementById('explanationVideos').textContent = this.dramas.explanation.length;
    }

    renderDramas() {
        this.renderDramaList('korean', 'koreanDramasList');
        this.renderDramaList('chinese', 'chineseDramasList');
        this.renderDramaList('explanation', 'explanationVideosList');
    }

    renderDramaList(category, containerId) {
        const container = document.getElementById(containerId);
        const dramas = this.dramas[category];
        
        if (dramas.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 40px;">No dramas added yet. Click "Add" to get started!</p>';
            return;
        }
        
        container.innerHTML = dramas.map(drama => `
            <div class="drama-item">
                <img src="${drama.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iODAiIGZpbGw9IiNlY2YwZjEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjN2Y4YzhkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'}" alt="${drama.title}" class="drama-thumbnail">
                <div class="drama-info">
                    <div class="drama-title">${drama.title}</div>
                    <div class="drama-meta">
                        ${drama.episodes ? `${drama.episodes} episodes` : ''} 
                        ${drama.videoLength ? `• ${drama.videoLength}` : ''}
                        ${drama.genre ? `• ${drama.genre}` : ''}
                        ${drama.status ? `• ${drama.status}` : ''}
                    </div>
                    <p style="color: #7f8c8d; font-size: 14px; margin-top: 5px; line-height: 1.4;">${drama.description.substring(0, 200)}${drama.description.length > 200 ? '...' : ''}</p>
                </div>
                <div class="drama-actions">
                    <button class="btn btn-primary" onclick="editDrama('${drama.id}', '${category}')">Edit</button>
                    <button class="btn btn-secondary" onclick="manageEpisodes('${drama.id}', '${category}')">Manage Episodes</button>
                    <button class="btn btn-danger" onclick="deleteDrama('${drama.id}', '${category}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    openAddModal(category = 'korean') {
        this.editingId = null;
        this.editingCategory = null;
        
        document.getElementById('modalTitle').textContent = 'Add New Drama';
        document.getElementById('category').value = category;
        document.getElementById('dramaForm').reset();
        document.getElementById('dramaModal').classList.add('active');
    }



    validateVideoFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Check file size (500MB limit)
        const maxSize = 500 * 1024 * 1024; // 500MB in bytes
        if (file.size > maxSize) {
            alert('File size too large. Please select a video under 500MB.');
            e.target.value = '';
            return;
        }
        
        // Check file type
        const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
        if (!allowedTypes.includes(file.type)) {
            alert('Invalid file type. Please select a valid video file (MP4, WebM, MOV, AVI, MKV).');
            e.target.value = '';
            return;
        }
        
        console.log('Valid video file selected:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2) + 'MB');
    }



    editDrama(id, category) {
        const drama = this.dramas[category].find(d => d.id === id);
        if (!drama) return;
        
        this.editingId = id;
        this.editingCategory = category;
        
        document.getElementById('modalTitle').textContent = 'Edit Drama';
        
        // Populate form (excluding file inputs)
        Object.keys(drama).forEach(key => {
            const input = document.getElementById(key);
            if (input && key !== 'thumbnail' && key !== 'videoFile') {
                input.value = drama[key] || '';
            }
        });
        
        document.getElementById('dramaModal').classList.add('active');
    }

    async deleteDrama(id, category) {
        if (!confirm('Are you sure you want to delete this drama?')) return;
        
        try {
            const response = await fetch(`${this.apiBase}/dramas/${category}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            if (response.ok) {
                await this.loadDramas();
                this.updateStats();
                this.renderDramas();
                
                // Update homepage UI after deletion
                if (typeof populateHighlightSelects === 'function') {
                    populateHighlightSelects();
                }
                if (typeof loadFeaturedContent === 'function') {
                    loadFeaturedContent();
                }
                
                this.showMessage('Drama deleted successfully!', 'success');
            } else {
                this.showMessage('Failed to delete drama', 'error');
            }
        } catch (error) {
            this.showMessage('Connection error', 'error');
        }
    }

    async handleDramaSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        
        // Validate required fields
        const title = formData.get('title');
        const description = formData.get('description');
        const videoFile = formData.get('videoFile');
        
        if (!title || title.trim() === '') {
            this.showMessage('Please enter a drama title', 'error');
            return;
        }
        
        if (!description || description.trim() === '') {
            this.showMessage('Please enter a description', 'error');
            return;
        }
        
        // Validate video file for new dramas
        if (!this.editingId && (!videoFile || videoFile.size === 0)) {
            this.showMessage('Please select a video file to upload', 'error');
            return;
        }
        
        // Validate video file size and type if provided
        if (videoFile && videoFile.size > 0) {
            const maxSize = 500 * 1024 * 1024; // 500MB
            const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
            
            if (videoFile.size > maxSize) {
                this.showMessage('Video file size must be less than 500MB', 'error');
                return;
            }
            
            if (!allowedTypes.includes(videoFile.type)) {
                this.showMessage('Please upload a valid video file (MP4, WebM, or OGG)', 'error');
                return;
            }
        }
        
        const method = this.editingId ? 'PUT' : 'POST';
        const url = this.editingId 
            ? `${this.apiBase}/dramas/${this.editingCategory}/${this.editingId}`
            : `${this.apiBase}/dramas`;
        
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: formData
            });
            
            if (response.ok) {
                this.closeModal();
                await this.loadDramas();
                this.updateStats();
                this.renderDramas();
                
                // Update homepage UI after saving
                if (typeof populateHighlightSelects === 'function') {
                    populateHighlightSelects();
                }
                if (typeof loadFeaturedContent === 'function') {
                    loadFeaturedContent();
                }
                
                this.showMessage(
                    this.editingId ? 'Drama updated successfully!' : 'Drama added successfully!',
                    'success'
                );
            } else {
                const error = await response.json();
                this.showMessage(error.message || 'Failed to save drama', 'error');
            }
        } catch (error) {
            console.error('Drama submit error:', error);
            this.showMessage('Connection error. Please check your network and try again.', 'error');
        }
    }

    closeModal() {
        document.getElementById('dramaModal').classList.remove('active');
        this.editingId = null;
        this.editingCategory = null;
    }

    previewImage(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                // You can add image preview functionality here
                console.log('Image selected:', file.name);
            };
            reader.readAsDataURL(file);
        }
    }

    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        messageDiv.textContent = message;
        
        const mainContent = document.querySelector('.main-content');
        mainContent.insertBefore(messageDiv, mainContent.firstChild);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    viewWebsite() {
        // Navigate to the main website (port 4000)
        window.open('http://localhost:4000', '_blank');
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('adminToken');
            window.location.href = 'index.html';
        }
    }
}

// Global functions for onclick handlers
function openAddModal(category) {
    adminPanel.openAddModal(category);
}

function closeModal() {
    adminPanel.closeModal();
}

function viewWebsite() {
    adminPanel.viewWebsite();
}

function logout() {
    adminPanel.logout();
}

// Episode management global functions
function manageEpisodes(dramaId, category) {
    adminPanel.manageEpisodes(dramaId, category);
}

function openAddEpisodeModal() {
    adminPanel.openAddEpisodeModal();
}

function closeEpisodeModal() {
    adminPanel.closeEpisodeModal();
}

function closeAddEpisodeModal() {
    adminPanel.closeAddEpisodeModal();
}

function editDrama(id, category) {
    adminPanel.editDrama(id, category);
}

function deleteDrama(id, category) {
    adminPanel.deleteDrama(id, category);
}

// Initialize admin panel
const adminPanel = new AdminPanel();

// Homepage Management Functions
let featuredContent = {
    hero: [null, null, null],
    highlights: {
        korean: null,
        chinese: null,
        explanation: null
    }
};

function selectForHero(slotNumber) {
    // Create modal to select drama for hero slot
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Select Drama for Hero Slot ${slotNumber}</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="hero-selection">
                <div class="drama-grid" id="heroSelectionGrid"></div>
            </div>
            <div style="padding: 20px; text-align: right;">
                <button class="btn" onclick="this.closest('.modal').remove()">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Populate with available dramas
    const grid = modal.querySelector('#heroSelectionGrid');
    const allDramas = [...(adminPanel.dramas.korean || []), ...(adminPanel.dramas.chinese || [])];
    
    allDramas.forEach(drama => {
        const card = document.createElement('div');
        card.className = 'hero-selection-card';
        card.innerHTML = `
            <img src="${drama.poster}" alt="${drama.title}">
            <h4>${drama.title}</h4>
            <p>${drama.genre}</p>
        `;
        card.onclick = () => {
            setHeroSlot(slotNumber, drama);
            modal.remove();
        };
        grid.appendChild(card);
    });
}

function setHeroSlot(slotNumber, drama) {
    // Add positioning options to drama object
    if (!drama.backgroundPosition) {
        drama.backgroundPosition = 'center';
    }
    if (!drama.backgroundSize) {
        drama.backgroundSize = 'cover';
    }
    
    featuredContent.hero[slotNumber - 1] = drama;
    
    const slotContent = document.getElementById(`hero-content-${slotNumber}`);
    slotContent.innerHTML = `
        <div class="slot-drama">
            <img src="${drama.poster}" alt="${drama.title}">
            <div class="slot-drama-info">
                <h4>${drama.title}</h4>
                <p>${drama.genre}</p>
            </div>
            <div class="positioning-controls">
                <label>Position:</label>
                <select onchange="updateDramaPosition(${slotNumber}, 'position', this.value)">
                    <option value="center" ${drama.backgroundPosition === 'center' ? 'selected' : ''}>Center</option>
                    <option value="top" ${drama.backgroundPosition === 'top' ? 'selected' : ''}>Top</option>
                    <option value="bottom" ${drama.backgroundPosition === 'bottom' ? 'selected' : ''}>Bottom</option>
                    <option value="left" ${drama.backgroundPosition === 'left' ? 'selected' : ''}>Left</option>
                    <option value="right" ${drama.backgroundPosition === 'right' ? 'selected' : ''}>Right</option>
                    <option value="center top" ${drama.backgroundPosition === 'center top' ? 'selected' : ''}>Center Top</option>
                    <option value="center bottom" ${drama.backgroundPosition === 'center bottom' ? 'selected' : ''}>Center Bottom</option>
                </select>
                <label>Size:</label>
                <select onchange="updateDramaPosition(${slotNumber}, 'size', this.value)">
                    <option value="contain" ${drama.backgroundSize === 'contain' ? 'selected' : ''}>Contain (No Crop)</option>
                    <option value="cover" ${drama.backgroundSize === 'cover' ? 'selected' : ''}>Cover (Fill)</option>
                    <option value="auto" ${drama.backgroundSize === 'auto' ? 'selected' : ''}>Auto</option>
                </select>
            </div>
        </div>
    `;
    
    // Save to backend
    saveFeaturedContent();
}

function updateDramaPosition(slotNumber, type, value) {
    const drama = featuredContent.hero[slotNumber - 1];
    if (drama) {
        if (type === 'position') {
            drama.backgroundPosition = value;
        } else if (type === 'size') {
            drama.backgroundSize = value;
        }
        
        // Save to backend and refresh homepage
        saveFeaturedContent();
        refreshHomepage();
    }
}

function updateSectionHighlight(section, dramaId) {
    featuredContent.highlights[section] = dramaId;
    saveFeaturedContent();
}

function saveFeaturedContent() {
    // Save featured content configuration
    const apiBase = window.location.protocol + '//' + window.location.host;
    fetch(apiBase + '/api/featured-content', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(featuredContent)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Featured content updated successfully!', 'success');
        }
    })
    .catch(error => {
        console.error('Error saving featured content:', error);
        showNotification('Error updating featured content', 'error');
    });
}

function loadFeaturedContent() {
    // Load current featured content configuration
    const apiBase = window.location.protocol + '//' + window.location.host;
    fetch(apiBase + '/api/featured-content', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                featuredContent = data.content;
                updateHomepageUI();
            }
        })
        .catch(error => {
            console.error('Error loading featured content:', error);
        });
}

function refreshHomepage() {
    // Trigger homepage refresh
    showNotification('Homepage refreshed successfully!', 'success');
}

function updateHomepageUI() {
    // Update hero slots
    featuredContent.hero.forEach((drama, index) => {
        if (drama) {
            setHeroSlot(index + 1, drama);
        }
    });
    
    // Update highlight selects
    Object.keys(featuredContent.highlights).forEach(section => {
        const select = document.getElementById(`${section}-highlight`);
        if (select && featuredContent.highlights[section]) {
            select.value = featuredContent.highlights[section];
        }
    });
}

function populateHighlightSelects() {
    // Populate Korean dramas - FIXED: use adminPanel.dramas instead of dramaData
    const koreanSelect = document.getElementById('korean-highlight');
    if (koreanSelect && adminPanel.dramas.korean) {
        // Clear existing options to avoid duplicates
        koreanSelect.innerHTML = '<option value="">Select Korean Drama</option>';
        adminPanel.dramas.korean.forEach(drama => {
            const option = document.createElement('option');
            option.value = drama.id;
            option.textContent = drama.title;
            koreanSelect.appendChild(option);
        });
    }
    
    // Populate Chinese dramas
    const chineseSelect = document.getElementById('chinese-highlight');
    if (chineseSelect && adminPanel.dramas.chinese) {
        // Clear existing options to avoid duplicates
        chineseSelect.innerHTML = '<option value="">Select Chinese Drama</option>';
        adminPanel.dramas.chinese.forEach(drama => {
            const option = document.createElement('option');
            option.value = drama.id;
            option.textContent = drama.title;
            chineseSelect.appendChild(option);
        });
    }
    
    // Populate explanation videos
    const explanationSelect = document.getElementById('explanation-highlight');
    if (explanationSelect && adminPanel.dramas.explanation) {
        // Clear existing options to avoid duplicates
        explanationSelect.innerHTML = '<option value="">Select Explanation Video</option>';
        adminPanel.dramas.explanation.forEach(video => {
            const option = document.createElement('option');
            option.value = video.id;
            option.textContent = video.title;
            explanationSelect.appendChild(option);
        });
    }
}

// Global showNotification function for compatibility
function showNotification(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;
    messageDiv.textContent = message;
    
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.insertBefore(messageDiv, mainContent.firstChild);
    } else {
        // Fallback for login page
        const messageContainer = document.getElementById('message');
        if (messageContainer) {
            messageContainer.className = `${type}-message`;
            messageContainer.textContent = message;
        }
    }
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}