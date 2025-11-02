// Load environment variables from production config
require('dotenv').config({ path: '../.env.production' });

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Import database models and functions
const { 
  Drama, 
  Episode, 
  FeaturedContent, 
  AdminUser,
  sequelize,
  getDramasByCategory,
  getAllDramasWithEpisodes
} = require('../database');

const app = express();
const PORT = process.env.ADMIN_PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

// CORS Configuration for production deployment
const corsOptions = {
  origin: [
    process.env.CORS_ORIGIN || 'https://admin.dramatize.site',
    process.env.MAIN_SITE_ORIGIN || 'https://dramatize.site',
    'http://localhost:4000',
    'http://localhost:3002'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Trust proxy for reverse proxy setup
app.set('trust proxy', true);

// Middleware to handle reverse proxy headers
app.use((req, res, next) => {
  // Get real client IP from reverse proxy headers
  req.clientIP = req.headers['x-forwarded-for'] || 
                 req.headers['x-real-ip'] || 
                 req.connection.remoteAddress || 
                 req.socket.remoteAddress ||
                 (req.connection.socket ? req.connection.socket.remoteAddress : null);
  
  // Set security headers for admin panel
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
});

// Serve static files from admin directory
app.use(express.static(__dirname));

// Create necessary directories
const uploadsDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath;
    
    // Handle different file types based on field name
    if (file.fieldname === 'videoFile' || file.fieldname === 'episodeVideoFile') {
      uploadPath = path.join(uploadsDir, 'videos');
    } else if (file.fieldname === 'thumbnail' || file.fieldname === 'episodeThumbnail') {
      uploadPath = path.join(uploadsDir, 'images');
    } else {
      // Default to images for unknown field types
      uploadPath = path.join(uploadsDir, 'images');
    }
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

// Database operations have replaced file-based data storage

// Admin credentials (in production, store hashed in database)
const ADMIN_CREDENTIALS = [
  {
    username: 'famsh.05',
    password: '$2b$10$l7mE9FfxnqxYb4p1Dqg9QO/xC4gXq5UiL/2JQSMzGybaljKRihDV2'
  },
  {
    username: 'developer',
    password: '$2b$10$bD6lGRXPwbnWaigXvlr/Ze14flqXVHfJ5oMOCxKSQUqSwVklT7GTa'
  }
];

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Routes

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = ADMIN_CREDENTIALS.find(u => u.username === username);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Validate token endpoint
app.get('/api/validate', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Get all dramas
app.get('/api/dramas', authenticateToken, async (req, res) => {
  try {
    const dramas = await Drama.findAll({
      include: [{
        model: Episode,
        as: 'episodes',
        order: [['episode_number', 'ASC']]
      }],
      order: [['created_at', 'DESC']]
    });

    // Group dramas by category for backward compatibility
    const dramasData = {
      korean: [],
      chinese: [],
      explanation: []
    };

    dramas.forEach(drama => {
      const dramaData = drama.toJSON();
      if (dramasData[drama.category]) {
        dramasData[drama.category].push(dramaData);
      }
    });

    res.json(dramasData);
  } catch (error) {
    console.error('Error fetching dramas:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new drama
app.post('/api/dramas', authenticateToken, upload.fields([
  { name: 'videoFile', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      genre,
      status,
      language,
      videoLength,
      subtitles
    } = req.body;

    // Generate unique ID for the drama
    const dramaId = `${category}_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    
    const dramaData = {
      id: dramaId,
      title,
      category,
      description,
      genre: genre || '',
      status: status || 'ongoing',
      language: language || '',
      videoLength: videoLength || '',
      subtitles: subtitles || '',
      year: new Date().getFullYear()
    };

    // Handle thumbnail upload
    if (req.files.thumbnail && req.files.thumbnail[0]) {
      dramaData.thumbnail = `/uploads/images/${req.files.thumbnail[0].filename}`;
    }

    // Create drama in database
    const newDrama = await Drama.create(dramaData);

    // Handle video file upload and create Episode 1
    if (req.files.videoFile && req.files.videoFile[0]) {
      const videoUrl = `/uploads/videos/${req.files.videoFile[0].filename}`;
      
      // Generate unique episode ID
      const episodeId = `episode_${newDrama.id}_1_${Date.now()}`;
      
      // Create Episode 1 from the uploaded video
      await Episode.create({
        id: episodeId,
        drama_id: newDrama.id,
        episode_number: 1,
        title: `${title} - Episode 1`,
        description: description || '',
        videoUrl: videoUrl,
        thumbnail: req.files.thumbnail ? `/uploads/images/${req.files.thumbnail[0].filename}` : ''
      });
    }

    // Fetch the complete drama with episodes
    const dramaWithEpisodes = await Drama.findByPk(newDrama.id, {
      include: [{
        model: Episode,
        as: 'episodes',
        order: [['episode_number', 'ASC']]
      }]
    });

    res.json({
      success: true,
      message: 'Drama added successfully',
      drama: dramaWithEpisodes
    });
  } catch (error) {
    console.error('Error adding drama:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update drama
app.put('/api/dramas/:category/:id', authenticateToken, upload.fields([
  { name: 'videoFile', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  try {
    const { category, id } = req.params;
    
    const drama = await Drama.findByPk(id);
    if (!drama) {
      return res.status(404).json({ message: 'Drama not found' });
    }

    const updateData = { ...req.body };

    // Handle file uploads
    if (req.files.videoFile && req.files.videoFile[0]) {
      updateData.videoUrl = `/uploads/videos/${req.files.videoFile[0].filename}`;
    }

    if (req.files.thumbnail && req.files.thumbnail[0]) {
      updateData.thumbnail = `/uploads/images/${req.files.thumbnail[0].filename}`;
    }

    await drama.update(updateData);

    // Fetch updated drama with episodes
    const updatedDrama = await Drama.findByPk(id, {
      include: [{
        model: Episode,
        as: 'episodes',
        order: [['episode_number', 'ASC']]
      }]
    });

    res.json({
      success: true,
      message: 'Drama updated successfully',
      drama: updatedDrama
    });
  } catch (error) {
    console.error('Error updating drama:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete drama
app.delete('/api/dramas/:category/:id', authenticateToken, async (req, res) => {
  try {
    const { category, id } = req.params;
    
    const drama = await Drama.findByPk(id, {
      include: [{
        model: Episode,
        as: 'episodes'
      }]
    });

    if (!drama) {
      return res.status(404).json({ message: 'Drama not found' });
    }

    const filesToDelete = [];
    
    // Collect main drama files
    if (drama.videoUrl) {
      const videoPath = path.join(__dirname, drama.videoUrl);
      filesToDelete.push(videoPath);
    }
    if (drama.thumbnail) {
      const thumbnailPath = path.join(__dirname, drama.thumbnail);
      filesToDelete.push(thumbnailPath);
    }
    
    // Collect all episode files
    if (drama.episodes && Array.isArray(drama.episodes)) {
      drama.episodes.forEach(episode => {
        if (episode.videoUrl) {
          const videoPath = path.join(__dirname, episode.videoUrl);
          filesToDelete.push(videoPath);
        }
        if (episode.thumbnail) {
          const thumbnailPath = path.join(__dirname, episode.thumbnail);
          filesToDelete.push(thumbnailPath);
        }
      });
    }

    // Remove all files from filesystem
    filesToDelete.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Deleted file: ${filePath}`);
        } catch (fileError) {
          console.error(`Failed to delete file ${filePath}:`, fileError);
        }
      }
    });

    // Delete from database (episodes will be deleted automatically due to cascade)
    await drama.destroy();

    res.json({
      success: true,
      message: 'Drama and all associated files deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting drama:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Episode Management APIs

// Add new episode to a drama
app.post('/api/dramas/:category/:dramaId/episodes', authenticateToken, upload.fields([
  { name: 'episodeVideoFile', maxCount: 1 },
  { name: 'episodeThumbnail', maxCount: 1 }
]), async (req, res) => {
  try {
    const { category, dramaId } = req.params;
    const {
      episodeNumber,
      episodeTitle,
      episodeDescription,
      episodeVideoLength,
      episodeAirDate,
      episodeIsAvailable
    } = req.body;

    const drama = await Drama.findByPk(dramaId);
    if (!drama) {
      return res.status(404).json({ message: 'Drama not found' });
    }

    // Auto-generate episode number if not provided
    let nextEpisodeNumber = parseInt(episodeNumber);
    if (!nextEpisodeNumber || nextEpisodeNumber <= 0) {
      const maxEpisode = await Episode.max('episode_number', {
        where: { drama_id: dramaId }
      });
      nextEpisodeNumber = (maxEpisode || 0) + 1;
    }

    // Check if episode number already exists
    const existingEpisode = await Episode.findOne({
      where: { 
        drama_id: dramaId,
        episode_number: nextEpisodeNumber 
      }
    });

    if (existingEpisode) {
      return res.status(400).json({ 
        message: `Episode ${nextEpisodeNumber} already exists. Please choose a different episode number.` 
      });
    }

    // Generate unique episode ID
    const episodeId = `episode_${dramaId}_${nextEpisodeNumber}_${Date.now()}`;
    
    const episodeData = {
      id: episodeId,
      drama_id: dramaId,
      episode_number: nextEpisodeNumber,
      title: episodeTitle || `Episode ${nextEpisodeNumber}`,
      description: episodeDescription || '',
      duration: episodeVideoLength ? parseInt(episodeVideoLength) : null,
      status: (episodeIsAvailable !== 'false' && episodeIsAvailable !== false) ? 'active' : 'inactive'
    };

    // Handle file uploads
    if (req.files && req.files.episodeVideoFile && req.files.episodeVideoFile[0]) {
      episodeData.videoUrl = `/uploads/videos/${req.files.episodeVideoFile[0].filename}`;
    }

    if (req.files && req.files.episodeThumbnail && req.files.episodeThumbnail[0]) {
      episodeData.thumbnail = `/uploads/images/${req.files.episodeThumbnail[0].filename}`;
    }

    const newEpisode = await Episode.create(episodeData);

    res.json({
      success: true,
      message: 'Episode added successfully',
      episode: newEpisode
    });
  } catch (error) {
    console.error('Error adding episode:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update episode
app.put('/api/dramas/:category/:dramaId/episodes/:episodeId', authenticateToken, upload.fields([
  { name: 'episodeVideoFile', maxCount: 1 },
  { name: 'episodeThumbnail', maxCount: 1 }
]), async (req, res) => {
  try {
    const { category, dramaId, episodeId } = req.params;
    const {
      episodeNumber,
      episodeTitle,
      episodeDescription,
      episodeVideoLength,
      episodeAirDate,
      episodeIsAvailable
    } = req.body;

    const episode = await Episode.findByPk(episodeId);
    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }

    const updateData = {
      episode_number: parseInt(episodeNumber),
      title: episodeTitle,
      description: episodeDescription || '',
      duration: episodeVideoLength ? parseInt(episodeVideoLength) : episode.duration,
      air_date: episodeAirDate || episode.air_date,
      status: (episodeIsAvailable !== 'false' && episodeIsAvailable !== false) ? 'active' : 'inactive'
    };

    // Handle file uploads
    if (req.files.episodeVideoFile && req.files.episodeVideoFile[0]) {
      updateData.videoUrl = `/uploads/videos/${req.files.episodeVideoFile[0].filename}`;
    }

    if (req.files.episodeThumbnail && req.files.episodeThumbnail[0]) {
      updateData.thumbnail = `/uploads/images/${req.files.episodeThumbnail[0].filename}`;
    }

    await episode.update(updateData);

    res.json({
      success: true,
      message: 'Episode updated successfully',
      episode: episode
    });
  } catch (error) {
    console.error('Error updating episode:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete episode
app.delete('/api/dramas/:category/:dramaId/episodes/:episodeId', authenticateToken, async (req, res) => {
  try {
    const { category, dramaId, episodeId } = req.params;

    const episode = await Episode.findByPk(episodeId);
    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }
    
    // Delete associated files from storage
    const filesToDelete = [];
    if (episode.videoUrl) {
      const videoPath = path.join(__dirname, episode.videoUrl);
      filesToDelete.push(videoPath);
    }
    if (episode.thumbnail) {
      const thumbnailPath = path.join(__dirname, episode.thumbnail);
      filesToDelete.push(thumbnailPath);
    }

    // Remove files from filesystem
    filesToDelete.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Deleted file: ${filePath}`);
        } catch (fileError) {
          console.error(`Failed to delete file ${filePath}:`, fileError);
        }
      }
    });

    // Delete from database
    await episode.destroy();

    res.json({
      success: true,
      message: 'Episode and associated files deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting episode:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Featured content operations now use database

// Get featured content
app.get('/api/featured-content', authenticateToken, async (req, res) => {
  try {
    const featuredContent = await FeaturedContent.findAll({
      order: [['position', 'ASC']]
    });
    res.json(featuredContent);
  } catch (error) {
    console.error('Error fetching featured content:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/featured-content', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { title, description, link, order } = req.body;
    
    const featuredData = {
      title,
      description,
      link,
      order: parseInt(order) || 0
    };

    if (req.file) {
      featuredData.image = `/uploads/images/${req.file.filename}`;
    }

    const newFeatured = await FeaturedContent.create(featuredData);

    res.json({
      success: true,
      message: 'Featured content added successfully',
      featured: newFeatured
    });
  } catch (error) {
    console.error('Error adding featured content:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/featured-content/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, link, order } = req.body;

    const featured = await FeaturedContent.findByPk(id);
    if (!featured) {
      return res.status(404).json({ message: 'Featured content not found' });
    }

    const updateData = {
      title,
      description,
      link,
      order: parseInt(order) || featured.order
    };

    if (req.file) {
      updateData.image = `/uploads/images/${req.file.filename}`;
    }

    await featured.update(updateData);

    res.json({
      success: true,
      message: 'Featured content updated successfully',
      featured: featured
    });
  } catch (error) {
    console.error('Error updating featured content:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/featured-content/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const featured = await FeaturedContent.findByPk(id);
    if (!featured) {
      return res.status(404).json({ message: 'Featured content not found' });
    }

    // Delete associated image file
    if (featured.image) {
      const imagePath = path.join(__dirname, featured.image);
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
          console.log(`Deleted image: ${imagePath}`);
        } catch (fileError) {
          console.error(`Failed to delete image ${imagePath}:`, fileError);
        }
      }
    }

    await featured.destroy();

    res.json({
      success: true,
      message: 'Featured content deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting featured content:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Serve admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Serve main website from parent directory
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Serve main website static files
app.use(express.static(path.join(__dirname, '..')));

// Start server
// Bind to all interfaces for production deployment
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dramatize Admin Server running on port ${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
  console.log(`Production URL: https://${process.env.ADMIN_DOMAIN || 'your-domain.com'}:${PORT}/admin`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit(0);
});

module.exports = app;


// Initialize database connection
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync models with database
    await sequelize.sync();
    console.log('Database models synchronized.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

// Initialize database on startup
initializeDatabase();