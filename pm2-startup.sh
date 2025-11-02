#!/bin/bash

# PM2 Startup Script for Dramatize Website and Admin Panel
# This script ensures both main website and admin panel start correctly

echo "Starting PM2 applications for Dramatize..."

# Stop any existing PM2 processes
echo "Stopping existing PM2 processes..."
pm2 stop all
pm2 delete all

# Start main website (port 4000)
echo "Starting main website on port 4000..."
cd /path/to/website/web\ 2
pm2 start ecosystem.config.js --env production

# Start admin panel (port 3002)
echo "Starting admin panel on port 3002..."
cd /path/to/website/web\ 2/admin
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
echo "Saving PM2 configuration..."
pm2 save

# Setup PM2 startup script
echo "Setting up PM2 startup script..."
pm2 startup

# Display status
echo "PM2 Status:"
pm2 status

echo "Applications started successfully!"
echo "Main Website: http://localhost:4000 (proxied via https://dramatize.site)"
echo "Admin Panel: http://localhost:3002 (proxied via https://admin.dramatize.site)"

# Check if applications are responding
echo "\nTesting application responses..."
echo "Testing main website:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000 && echo " - Main website is responding" || echo " - Main website is not responding"

echo "Testing admin panel:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 && echo " - Admin panel is responding" || echo " - Admin panel is not responding"

echo "\nSetup complete! Both applications should now be running and accessible through Nginx reverse proxy."