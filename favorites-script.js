function toggleFavoriteCard(dramaId) {
    if (!currentUser) {
        showNotification('Please login to add favorites', 'error');
        return;
    }
    
    const favorites = JSON.parse(localStorage.getItem(`favorites_${currentUser.email}`) || '[]');
    const isCurrentlyFavorited = favorites.some(fav => String(fav.id) === String(dramaId));
    
    if (isCurrentlyFavorited) {
        // Remove from favorites
        const updatedFavorites = favorites.filter(fav => String(fav.id) !== String(dramaId));
        localStorage.setItem(`favorites_${currentUser.email}`, JSON.stringify(updatedFavorites));
        showNotification('Removed from favorites', 'success');
    } else {
        // Add to favorites
        const drama = findDramaById(dramaId);
        if (drama) {
            favorites.push(drama);
            localStorage.setItem(`favorites_${currentUser.email}`, JSON.stringify(favorites));
            showNotification('Added to favorites', 'success');
        }
    }
    
    // Update heart icon
    updateHeartIcon(dramaId);
    // Refresh profile favorites if visible
    if (document.getElementById('userProfile').style.display !== 'none') {
        loadProfileFavorites();
    }
}