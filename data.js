// Drama data for Dramatize
const sampleDramaData = {
    koreanDramas: [],
    chineseDramas: [],
    explanationContent: []
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = sampleDramaData;
}

// Initialize window data structure for browser
if (typeof window !== 'undefined') {
    window.dramaData = {
        koreanDramas: [],
        chineseDramas: [],
        explanationContent: []
    };

    // Load data with fallback to empty data
    async function loadDramaData() {
        try {
            const timestamp = new Date().getTime();
        const response = await fetch(`/api/dramas?_t=${timestamp}`);
            if (response.ok) {
                const data = await response.json();
                window.dramaData = {
                    koreanDramas: data.korean || [],
                    chineseDramas: data.chinese || [],
                    explanationContent: data.explanation || []
                };
                return window.dramaData;
            }
        } catch (error) {
            console.log('Admin API not available, using empty data');
        }
        
        // Return empty data structure
        return window.dramaData;
    }

    // Load data when the script loads
    loadDramaData();
}

// User data structure (for local storage)
const userDataStructure = {
    isLoggedIn: false,
    email: "",
    favorites: [], // Array of drama IDs
    continueWatching: [],
    history: []
};

// Helper function to add new drama with auto episode detection
function addNewDrama(title, folderPath, category = 'korean') {
    const newDrama = {
        id: Date.now().toString(),
        title: title,
        thumbnail: `https://via.placeholder.com/250x200?text=${encodeURIComponent(title)}`,
        genre: "Drama",
        description: `${title} drama series.`,
        videoUrl: folderPath,
        videoLength: "24:00",
        status: "ongoing",
        language: "English",
        episodes: [], // Changed from number to array
        episodeList: [] // Keep for backward compatibility
    };
    
    // Add to appropriate category
    if (category === 'korean') {
        if (typeof window !== 'undefined' && window.dramaData) {
            window.dramaData.koreanDramas.push(newDrama);
        }
    } else if (category === 'chinese') {
        if (typeof window !== 'undefined' && window.dramaData) {
            window.dramaData.chineseDramas.push(newDrama);
        }
    }
    
    return newDrama;
}

// Export functions if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { sampleDramaData, userDataStructure, addNewDrama };
}