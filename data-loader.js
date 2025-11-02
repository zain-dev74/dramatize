// Data Loading and Management Functions for Dramatize Website

// Load data with dynamic episode detection
async function loadDramaData() {
    try {
        // Add cache-busting parameter
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/dramas?_t=${timestamp}`, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        if (response.ok) {
            const data = await response.json();
            console.log('Loaded drama data:', data);
            window.dramaData = {
                koreanDramas: data.korean || [],
                chineseDramas: data.chinese || [],
                explanationContent: data.explanation || []
            };
            return window.dramaData;
        }
    } catch (error) {
        console.log('Admin API not available, using dynamic detection:', error);
    }
    
    // Dynamic data with auto-detected episodes
    window.dramaData = {
        koreanDramas: [
            {
                id: "1",
                title: "Solo Leveling",
                thumbnail: "https://via.placeholder.com/250x200?text=Solo+Leveling",
                genre: "Action, Fantasy, Anime",
                description: "An ordinary hunter becomes the world's strongest after a mysterious system awakens within him.",
                videoUrl: "../SOLO LEVLING video/Solo Leveling Season 1 Recap.mp4",
                videoLength: "24:00",
                status: "completed",
                language: "English",
                episodes: 0, // Will be set dynamically
                episodeList: [] // Will be populated dynamically
            }
        ],
        chineseDramas: [
            {
                id: "2",
                title: "Reborn",
                thumbnail: "https://via.placeholder.com/250x200?text=Reborn",
                genre: "Romance, Drama",
                description: "A romantic drama about second chances and new beginnings.",
                videoUrl: "../REBORN/episode 4/01scene/scene1.mp4",
                videoLength: "45:00",
                status: "ongoing",
                language: "English",
                episodes: 0, // Will be set dynamically
                episodeList: [] // Will be populated dynamically
            }
        ],
        explanationContent: [
            {
                id: "3",
                title: "July 2025 K-Drama Preview",
                thumbnail: "https://via.placeholder.com/250x200?text=July+2025+Preview",
                description: "Preview of upcoming Korean dramas for July 2025.",
                videoUrl: "../Flix done/JULY KDRAMA 2025.mp4",
                videoLength: "15:30",
                language: "English"
            }
        ]
    };
    
    // Populate episodes dynamically
    window.dramaData.koreanDramas.forEach(drama => {
        drama.episodeList = detectEpisodesFromFolder(drama.title, drama.videoUrl);
        drama.episodes = drama.episodeList.length;
    });
    
    window.dramaData.chineseDramas.forEach(drama => {
        drama.episodeList = detectEpisodesFromFolder(drama.title, drama.videoUrl);
        drama.episodes = drama.episodeList.length;
    });
    
    return window.dramaData;
}

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
        episodes: 0,
        episodeList: []
    };
    
    // Detect episodes automatically
    newDrama.episodeList = detectEpisodesFromFolder(title, folderPath);
    newDrama.episodes = newDrama.episodeList.length;
    
    // Add to appropriate category
    if (category === 'korean') {
        window.dramaData.koreanDramas.push(newDrama);
    } else if (category === 'chinese') {
        window.dramaData.chineseDramas.push(newDrama);
    }
    
    return newDrama;
}

// Load data when the script loads
if (typeof window !== 'undefined') {
    loadDramaData();
}

// Export the functions if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadDramaData, addNewDrama };
}