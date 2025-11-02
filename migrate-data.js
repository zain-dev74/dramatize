// Data Migration Script
// This script migrates existing JSON data to the database
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// Import database models and connection
const { 
  sequelize,
  models: {
    Drama, 
    Episode, 
    FeaturedContent, 
    Analytics, 
    AnalyticsSummary, 
    AdminUser
  }
} = require('./database');

// File paths
const ADMIN_DATA_DIR = path.join(__dirname, 'admin', 'data');
const DRAMAS_FILE = path.join(ADMIN_DATA_DIR, 'dramas.json');
const FEATURED_CONTENT_FILE = path.join(ADMIN_DATA_DIR, 'featured-content.json');
const MAIN_DATA_FILE = path.join(__dirname, 'data.js');

async function migrateDramas() {
  console.log('🔄 Migrating dramas and episodes...');
  
  let dramasData = {};
  
  // Try to read from admin dramas.json first
  if (fs.existsSync(DRAMAS_FILE)) {
    try {
      const adminData = fs.readFileSync(DRAMAS_FILE, 'utf8');
      dramasData = JSON.parse(adminData);
      console.log('📁 Found admin dramas.json file');
    } catch (error) {
      console.error('❌ Error reading admin dramas.json:', error);
    }
  }
  
  // Fallback to main data.js file
  if (Object.keys(dramasData).length === 0 && fs.existsSync(MAIN_DATA_FILE)) {
    try {
      const data = fs.readFileSync(MAIN_DATA_FILE, 'utf8');
      const match = data.match(/const sampleDramaData = ({[\s\S]*?});/);
      if (match) {
        const mainData = JSON.parse(match[1]);
        dramasData = {
          korean: mainData.koreanDramas || [],
          chinese: mainData.chineseDramas || [],
          thai: mainData.thaiDramas || [],
          japanese: mainData.japaneseDramas || []
        };
        console.log('📁 Found main data.js file');
      }
    } catch (error) {
      console.error('❌ Error reading main data.js:', error);
    }
  }
  
  if (Object.keys(dramasData).length === 0) {
    console.log('⚠️  No existing drama data found to migrate');
    return;
  }
  
  let totalDramas = 0;
  let totalEpisodes = 0;
  
  // Migrate dramas by category
  for (const [category, dramas] of Object.entries(dramasData)) {
    if (!Array.isArray(dramas)) continue;
    
    console.log(`📺 Migrating ${dramas.length} ${category} dramas...`);
    
    for (const drama of dramas) {
      try {
        // Create drama record
        const dramaData = {
          title: drama.title,
          description: drama.description || '',
          genre: drama.genre || '',
          status: drama.status || 'ongoing',
          category: category,
          videoUrl: drama.videoUrl || '',
          videoSource: drama.videoSource || '',
          thumbnail: drama.thumbnail || '',
          episodeCount: drama.episodeCount || (Array.isArray(drama.episodes) ? drama.episodes.length : (drama.episodes || 1)),
          rating: drama.rating || 0,
          year: drama.year || new Date().getFullYear(),
          isActive: drama.isActive !== false
        };
        
        const newDrama = await Drama.create(dramaData);
        totalDramas++;
        
        // Migrate episodes if they exist
        if (Array.isArray(drama.episodes) && drama.episodes.length > 0) {
          for (const episode of drama.episodes) {
            try {
              const episodeData = {
                dramaId: newDrama.id,
                episodeNumber: episode.episodeNumber || 1,
                title: episode.title || `Episode ${episode.episodeNumber || 1}`,
                description: episode.description || '',
                videoUrl: episode.videoUrl || '',
                thumbnail: episode.thumbnail || '',
                videoLength: episode.videoLength || '',
                airDate: episode.airDate || new Date().toISOString().split('T')[0],
                isAvailable: episode.isAvailable !== false
              };
              
              await Episode.create(episodeData);
              totalEpisodes++;
            } catch (episodeError) {
              console.error(`❌ Error migrating episode ${episode.episodeNumber} for drama ${drama.title}:`, episodeError);
            }
          }
        }
        
        console.log(`✅ Migrated drama: ${drama.title} (${Array.isArray(drama.episodes) ? drama.episodes.length : 0} episodes)`);
      } catch (dramaError) {
        console.error(`❌ Error migrating drama ${drama.title}:`, dramaError);
      }
    }
  }
  
  console.log(`🎉 Successfully migrated ${totalDramas} dramas and ${totalEpisodes} episodes`);
}

async function migrateFeaturedContent() {
  console.log('🔄 Migrating featured content...');
  
  if (!fs.existsSync(FEATURED_CONTENT_FILE)) {
    console.log('⚠️  No featured content file found to migrate');
    return;
  }
  
  try {
    const data = fs.readFileSync(FEATURED_CONTENT_FILE, 'utf8');
    const featuredData = JSON.parse(data);
    
    let totalFeatured = 0;
    
    // Migrate hero content
    if (featuredData.hero && Array.isArray(featuredData.hero)) {
      for (let i = 0; i < featuredData.hero.length; i++) {
        const hero = featuredData.hero[i];
        if (hero && hero.id) { // Only migrate valid hero items with IDs
          const heroData = {
            type: 'hero',
            category: hero.category || 'general',
            drama_id: hero.id,
            position: i + 1,
            status: 'active'
          };
          
          await FeaturedContent.create(heroData);
          totalFeatured++;
        }
      }
    }
    
    // Migrate highlights
    if (featuredData.highlights) {
      let position = 1;
      for (const [category, dramaId] of Object.entries(featuredData.highlights)) {
        if (dramaId && typeof dramaId === 'string') {
          const highlightData = {
            type: 'highlight',
            category: category,
            drama_id: dramaId,
            position: position++,
            status: 'active'
          };
          
          await FeaturedContent.create(highlightData);
          totalFeatured++;
        }
      }
    }
    
    // Migrate featured array if it exists
    if (featuredData.featured && Array.isArray(featuredData.featured)) {
      for (let i = 0; i < featuredData.featured.length; i++) {
        const featured = featuredData.featured[i];
        if (featured) {
          const featuredItemData = {
            title: featured.title || `Featured ${i + 1}`,
            description: featured.description || '',
            image: featured.image || '',
            link: featured.link || '',
            order: 200 + i, // Start after highlights
            type: 'featured'
          };
          
          await FeaturedContent.create(featuredItemData);
          totalFeatured++;
        }
      }
    }
    
    console.log(`🎉 Successfully migrated ${totalFeatured} featured content items`);
  } catch (error) {
    console.error('❌ Error migrating featured content:', error);
  }
}

async function createAdminUser() {
  console.log('🔄 Creating admin user...');
  
  try {
    // Check if admin user already exists
    const existingAdmin = await AdminUser.findOne({
      where: { username: process.env.ADMIN_USERNAME || 'famsh.05' }
    });
    
    if (existingAdmin) {
      console.log('👤 Admin user already exists');
      return;
    }
    
    // Hash the password
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    // Create admin user
    const adminData = {
      username: process.env.ADMIN_USERNAME || 'famsh.05',
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password_hash: password_hash,
      role: 'admin',
      status: 'active'
    };
    
    await AdminUser.create(adminData);
    console.log('✅ Admin user created successfully');
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

async function runMigration() {
  console.log('🚀 Starting data migration...');
  console.log('=====================================');
  
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Sync database models
    await sequelize.sync({ force: false });
    console.log('✅ Database models synchronized');
    
    // Run migrations
    await migrateDramas();
    await migrateFeaturedContent();
    await createAdminUser();
    
    console.log('=====================================');
    console.log('🎉 Data migration completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Test the website and admin panel');
    console.log('2. Verify that all data has been migrated correctly');
    console.log('3. Backup your original JSON files before deleting them');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration, migrateDramas, migrateFeaturedContent, createAdminUser };