// Database connection and models for Dramatize website
const { Sequelize, DataTypes } = require('sequelize');

// Database configuration
const path = require('path');
const dbConfig = {
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || path.join(__dirname, 'database.sqlite'),
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
};

// Create Sequelize instance
const sequelize = new Sequelize(dbConfig);

// Define Drama model
const Drama = sequelize.define('Drama', {
    id: {
        type: DataTypes.STRING(50),
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    category: {
        type: DataTypes.ENUM('korean', 'chinese', 'explanation'),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    thumbnail: {
        type: DataTypes.STRING(500)
    },
    videoUrl: {
        type: DataTypes.STRING(500)
    },
    year: {
        type: DataTypes.INTEGER
    },
    genre: {
        type: DataTypes.STRING(100)
    },
    status: {
        type: DataTypes.STRING(50),
        defaultValue: 'active'
    }
}, {
    tableName: 'dramas',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Define Episode model
const Episode = sequelize.define('Episode', {
    id: {
        type: DataTypes.STRING(50),
        primaryKey: true
    },
    drama_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
        references: {
            model: Drama,
            key: 'id'
        }
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    episode_number: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    videoUrl: {
        type: DataTypes.STRING(500)
    },
    thumbnail: {
        type: DataTypes.STRING(500)
    },
    duration: {
        type: DataTypes.INTEGER
    },
    status: {
        type: DataTypes.STRING(50),
        defaultValue: 'active'
    }
}, {
    tableName: 'episodes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Define FeaturedContent model
const FeaturedContent = sequelize.define('FeaturedContent', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    type: {
        type: DataTypes.ENUM('hero', 'highlight'),
        allowNull: false
    },
    category: {
        type: DataTypes.STRING(50)
    },
    drama_id: {
        type: DataTypes.STRING(50),
        references: {
            model: Drama,
            key: 'id'
        }
    },
    position: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING(50),
        defaultValue: 'active'
    }
}, {
    tableName: 'featured_content',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Define Analytics model
const Analytics = sequelize.define('Analytics', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    event_type: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    drama_id: {
        type: DataTypes.STRING(50),
        references: {
            model: Drama,
            key: 'id'
        }
    },
    episode_id: {
        type: DataTypes.STRING(50),
        references: {
            model: Episode,
            key: 'id'
        }
    },
    user_ip: {
        type: DataTypes.STRING(45)
    },
    user_agent: {
        type: DataTypes.TEXT
    },
    country: {
        type: DataTypes.STRING(100)
    },
    city: {
        type: DataTypes.STRING(100)
    },
    data: {
        type: DataTypes.JSON
    }
}, {
    tableName: 'analytics',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

// Define AnalyticsSummary model
const AnalyticsSummary = sequelize.define('AnalyticsSummary', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        unique: true
    },
    total_views: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    unique_visitors: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    top_dramas: {
        type: DataTypes.JSON
    },
    top_countries: {
        type: DataTypes.JSON
    },
    summary_data: {
        type: DataTypes.JSON
    }
}, {
    tableName: 'analytics_summary',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Define AdminUser model
const AdminUser = sequelize.define('AdminUser', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(255)
    },
    role: {
        type: DataTypes.ENUM('admin', 'moderator'),
        defaultValue: 'admin'
    },
    status: {
        type: DataTypes.STRING(50),
        defaultValue: 'active'
    },
    last_login: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'admin_users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Define associations
Drama.hasMany(Episode, { foreignKey: 'drama_id', as: 'episodes' });
Episode.belongsTo(Drama, { foreignKey: 'drama_id', as: 'drama' });

Drama.hasMany(FeaturedContent, { foreignKey: 'drama_id', as: 'featured' });
FeaturedContent.belongsTo(Drama, { foreignKey: 'drama_id', as: 'drama' });

Drama.hasMany(Analytics, { foreignKey: 'drama_id', as: 'analytics' });
Analytics.belongsTo(Drama, { foreignKey: 'drama_id', as: 'drama' });

Episode.hasMany(Analytics, { foreignKey: 'episode_id', as: 'analytics' });
Analytics.belongsTo(Episode, { foreignKey: 'episode_id', as: 'episode' });

// Database connection functions
async function connectDatabase() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');
        return true;
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error.message);
        return false;
    }
}

async function syncDatabase(force = false) {
    try {
        await sequelize.sync({ force });
        console.log('✅ Database synchronized successfully.');
        return true;
    } catch (error) {
        console.error('❌ Database synchronization failed:', error.message);
        return false;
    }
}

// Helper functions for data operations
const DatabaseHelpers = {
    // Drama operations
    async getAllDramas() {
        return await Drama.findAll({
            include: [{
                model: Episode,
                as: 'episodes',
                where: { status: 'active' },
                required: false
            }],
            where: { status: 'active' },
            order: [['created_at', 'DESC']]
        });
    },

    async getDramasByCategory(category) {
        return await Drama.findAll({
            where: { category, status: 'active' },
            include: [{
                model: Episode,
                as: 'episodes',
                where: { status: 'active' },
                required: false
            }],
            order: [['created_at', 'DESC']]
        });
    },

    async createDrama(dramaData) {
        return await Drama.create(dramaData);
    },

    async getAllDramasWithEpisodes() {
        return await Drama.findAll({
            include: [{
                model: Episode,
                as: 'episodes',
                order: [['episode_number', 'ASC']]
            }],
            order: [['created_at', 'DESC']]
        });
    },

    async getDramaWithEpisodes(dramaId) {
        return await Drama.findByPk(dramaId, {
            include: [{
                model: Episode,
                as: 'episodes',
                order: [['episode_number', 'ASC']]
            }]
        });
    },

    async updateDrama(id, dramaData) {
        const [updatedRowsCount] = await Drama.update(dramaData, {
            where: { id }
        });
        return updatedRowsCount > 0;
    },

    async deleteDrama(id) {
        return await Drama.destroy({
            where: { id }
        });
    },

    // Episode operations
    async createEpisode(episodeData) {
        return await Episode.create(episodeData);
    },

    async updateEpisode(id, episodeData) {
        const [updatedRowsCount] = await Episode.update(episodeData, {
            where: { id }
        });
        return updatedRowsCount > 0;
    },

    async deleteEpisode(id) {
        return await Episode.destroy({
            where: { id }
        });
    },

    // Featured content operations
    async getFeaturedContent() {
        const heroContent = await FeaturedContent.findAll({
            where: { type: 'hero', status: 'active' },
            include: [{ model: Drama, as: 'drama' }],
            order: [['position', 'ASC']],
            limit: 3
        });

        const highlights = await FeaturedContent.findAll({
            where: { type: 'highlight', status: 'active' },
            include: [{ model: Drama, as: 'drama' }],
            order: [['category', 'ASC'], ['position', 'ASC']]
        });

        return {
            hero: heroContent.map(item => item.drama),
            highlights: {
                korean: highlights.find(h => h.category === 'korean')?.drama || null,
                chinese: highlights.find(h => h.category === 'chinese')?.drama || null,
                explanation: highlights.find(h => h.category === 'explanation')?.drama || null
            }
        };
    },

    async updateFeaturedContent(featuredData) {
        // Clear existing featured content
        await FeaturedContent.destroy({ where: {} });

        // Add hero content
        if (featuredData.hero && Array.isArray(featuredData.hero)) {
            for (let i = 0; i < featuredData.hero.length; i++) {
                if (featuredData.hero[i]) {
                    await FeaturedContent.create({
                        type: 'hero',
                        drama_id: featuredData.hero[i].id,
                        position: i
                    });
                }
            }
        }

        // Add highlight content
        if (featuredData.highlights) {
            for (const [category, drama] of Object.entries(featuredData.highlights)) {
                if (drama) {
                    await FeaturedContent.create({
                        type: 'highlight',
                        category,
                        drama_id: drama.id,
                        position: 0
                    });
                }
            }
        }

        return true;
    }
};

module.exports = {
    sequelize,
    connectDatabase,
    syncDatabase,
    Drama,
    Episode,
    FeaturedContent,
    Analytics,
    AnalyticsSummary,
    AdminUser,
    getDramasByCategory: DatabaseHelpers.getDramasByCategory,
    getDramaWithEpisodes: DatabaseHelpers.getDramaWithEpisodes,
    getAllDramasWithEpisodes: DatabaseHelpers.getAllDramasWithEpisodes,
    models: {
        Drama,
        Episode,
        FeaturedContent,
        Analytics,
        AnalyticsSummary,
        AdminUser
    },
    helpers: DatabaseHelpers
};