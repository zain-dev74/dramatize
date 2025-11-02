-- Dramatize Website Database Schema
-- MySQL Database Setup for Drama Streaming Website

-- Create database (run this first)
-- CREATE DATABASE dramatize_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE dramatize_db;

-- Table for storing drama information
CREATE TABLE dramas (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category ENUM('korean', 'chinese', 'explanation') NOT NULL,
    description TEXT,
    thumbnail VARCHAR(500),
    videoUrl VARCHAR(500),
    year INT,
    genre VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Table for storing episode information
CREATE TABLE episodes (
    id VARCHAR(50) PRIMARY KEY,
    drama_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    episode_number INT NOT NULL,
    description TEXT,
    videoUrl VARCHAR(500),
    thumbnail VARCHAR(500),
    duration INT, -- in seconds
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (drama_id) REFERENCES dramas(id) ON DELETE CASCADE,
    INDEX idx_drama_id (drama_id),
    INDEX idx_episode_number (episode_number),
    INDEX idx_status (status),
    UNIQUE KEY unique_drama_episode (drama_id, episode_number)
);

-- Table for storing featured content configuration
CREATE TABLE featured_content (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('hero', 'highlight') NOT NULL,
    category VARCHAR(50),
    drama_id VARCHAR(50),
    position INT NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (drama_id) REFERENCES dramas(id) ON DELETE CASCADE,
    INDEX idx_type_position (type, position),
    INDEX idx_category (category),
    INDEX idx_status (status)
);

-- Table for storing analytics data
CREATE TABLE analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    drama_id VARCHAR(50),
    episode_id VARCHAR(50),
    user_ip VARCHAR(45),
    user_agent TEXT,
    country VARCHAR(100),
    city VARCHAR(100),
    data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (drama_id) REFERENCES dramas(id) ON DELETE SET NULL,
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE SET NULL,
    INDEX idx_date (date),
    INDEX idx_event_type (event_type),
    INDEX idx_drama_id (drama_id),
    INDEX idx_created_at (created_at)
);

-- Table for storing daily analytics summaries
CREATE TABLE analytics_summary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    total_views INT DEFAULT 0,
    unique_visitors INT DEFAULT 0,
    top_dramas JSON,
    top_countries JSON,
    summary_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_date (date)
);

-- Table for admin users (for future expansion)
CREATE TABLE admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role ENUM('admin', 'moderator') DEFAULT 'admin',
    status VARCHAR(50) DEFAULT 'active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_status (status)
);

-- Insert default admin users
INSERT INTO admin_users (username, password_hash, role) VALUES 
('famsh.05', '$2b$10$l7mE9FfxnqxYb4p1Dqg9QO/xC4gXq5UiL/2JQSMzGybaljKRihDV2', 'admin'),
('developer', '$2b$10$bD6lGRXPwbnWaigXvlr/Ze14flqXVHfJ5oMOCxKSQUqSwVklT7GTa', 'admin');

-- Sample data structure for testing (optional)
-- INSERT INTO dramas (id, title, category, description) VALUES 
-- ('drama_001', 'Sample Korean Drama', 'korean', 'A sample drama for testing'),
-- ('drama_002', 'Sample Chinese Drama', 'chinese', 'Another sample drama for testing');

-- INSERT INTO episodes (id, drama_id, title, episode_number) VALUES 
-- ('ep_001', 'drama_001', 'Episode 1', 1),
-- ('ep_002', 'drama_001', 'Episode 2', 2);