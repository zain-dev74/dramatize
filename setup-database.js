// Database Setup Script for SQLite
const { sequelize, syncDatabase } = require('./database');

async function setupDatabase() {
    try {
        console.log('🚀 Starting SQLite database setup...');
        
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');
        
        // Synchronize all models (create tables)
        await syncDatabase(false); // Set to true to force recreate tables
        console.log('✅ Database tables synchronized successfully.');
        
        console.log('🎉 Database setup completed successfully!');
        console.log('📝 Next steps:');
        console.log('   1. Run: node migrate-data.js (to migrate existing JSON data)');
        console.log('   2. Start the servers: npm start');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        console.log('\nCommon solutions:');
        console.log('1. Make sure you have sqlite3 installed: npm install sqlite3');
        console.log('2. Check file permissions in the project directory');
        console.log('3. Ensure the database file path is writable');
    } finally {
        await sequelize.close();
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    setupDatabase();
}

module.exports = { setupDatabase };