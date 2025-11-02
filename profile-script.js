function toggleProfile() {
    const profileSection = document.getElementById('userProfile');
    const isVisible = profileSection.style.display !== 'none';
    
    if (isVisible) {
        profileSection.style.display = 'none';
    } else {
        profileSection.style.display = 'block';
        loadProfileFavorites();
        updateProfileInfo();
    }
}

function loadProfileFavorites() {
    if (!currentUser) return;
    
    const favorites = JSON.parse(localStorage.getItem(`favorites_${currentUser.email}`) || '[]');
    const container = document.getElementById('profileFavorites');
    
    if (favorites.length === 0) {
        container.innerHTML = `
            <div class="empty-favorites" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <i class="fas fa-heart" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p>No favorites yet. Start adding dramas to your favorites!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = favorites.map(drama => createDramaCard(drama)).join('');
}

function updateProfileInfo() {
    if (!currentUser) return;
    
    document.getElementById('profileUserName').textContent = currentUser.name || 'User';
    document.getElementById('profileUserEmail').textContent = currentUser.email || 'user@example.com';
}