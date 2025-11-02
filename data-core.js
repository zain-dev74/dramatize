// Sample Drama Data for Dramatize Website - Core Data Structures

// Updated data.js to work with admin panel
window.dramaData = {
    koreanDramas: [],
    chineseDramas: [],
    explanationContent: []
};

// Dynamic episode detection function
function detectEpisodesFromFolder(dramaTitle, basePath) {
    const episodes = [];
    
    // For Solo Leveling - scan SOLO LEVLING video folder
    if (dramaTitle === "Solo Leveling") {
        const videoFiles = [
            "Solo Leveling Season 1 Recap.mp4",
            "Solo Leveling _ DUB TRAILER.mp4",
            "Solo Leveling- ARISE OVERDRIVE on Steam.webm",
            "solo levling code-highlight.mp4",
            "solo levling code.mp4"
        ];
        
        videoFiles.forEach((file, index) => {
            episodes.push({
                number: index + 1,
                title: `Episode ${index + 1}`,
                videoUrl: `../SOLO LEVLING video/${file}`,
                duration: "24:00"
            });
        });
        
        console.log('Solo Leveling episodes detected:', episodes);
    }
    
    // For Reborn - scan REBORN folder structure
    else if (dramaTitle === "Reborn") {
        // Episode 4 scenes
        const episode4Scenes = [
            "01scene/scene1.mp4",
            "02 scene/scene2.mp4", 
            "03 scene/scene3.mp4",
            "04 scene/scene4.mp4",
            "05 scene/scene5.mp4",
            "06 scene/scene6.mp4"
        ];
        
        episode4Scenes.forEach((scene, index) => {
            episodes.push({
                number: index + 1,
                title: `Episode 4 - Scene ${index + 1}`,
                videoUrl: `../REBORN/episode 4/${scene}`,
                duration: "45:00"
            });
        });
        
        // Episode 5 scenes
        const episode5Scenes = [
            "01 scene/scene1.mp4",
            "02 scene/scene2.mp4",
            "03 scene/scene3.mp4"
        ];
        
        episode5Scenes.forEach((scene, index) => {
            episodes.push({
                number: episode4Scenes.length + index + 1,
                title: `Episode 5 - Scene ${index + 1}`,
                videoUrl: `../REBORN/Episode no 5/${scene}`,
                duration: "45:00"
            });
        });
    }
    
    return episodes;
}

// Make sure the function is globally accessible
window.detectEpisodesFromFolder = detectEpisodesFromFolder;

// User data structure (for local storage)
const userDataStructure = {
    isLoggedIn: false,
    email: "",
    favorites: [], // Array of drama IDs
    continueWatching: [
        // Example structure
        // { id: 1, title: "Reborn", episode: 5, time: "23:45", thumbnail: "url" }
    ],
    history: [
        // Example structure
        // { id: 1, title: "Reborn", episode: 5, lastWatched: "2023-05-15T14:30:00" }
    ]
};

// Export the data if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { dramaData, userDataStructure, detectEpisodesFromFolder };
}