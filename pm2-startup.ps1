# PM2 Startup Script for Dramatize Website and Admin Panel (Windows PowerShell)
# This script ensures both main website and admin panel start correctly

Write-Host "Starting PM2 applications for Dramatize..." -ForegroundColor Green

# Stop any existing PM2 processes
Write-Host "Stopping existing PM2 processes..." -ForegroundColor Yellow
pm2 stop all
pm2 delete all

# Start main website (port 4000)
Write-Host "Starting main website on port 4000..." -ForegroundColor Cyan
Set-Location "d:\website\web 2"
pm2 start ecosystem.config.js --env production

# Start admin panel (port 3002)
Write-Host "Starting admin panel on port 3002..." -ForegroundColor Cyan
Set-Location "d:\website\web 2\admin"
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
Write-Host "Saving PM2 configuration..." -ForegroundColor Yellow
pm2 save

# Display status
Write-Host "PM2 Status:" -ForegroundColor Green
pm2 status

Write-Host "Applications started successfully!" -ForegroundColor Green
Write-Host "Main Website: http://localhost:4000 (proxied via https://dramatize.site)" -ForegroundColor White
Write-Host "Admin Panel: http://localhost:3002 (proxied via https://admin.dramatize.site)" -ForegroundColor White

# Check if applications are responding
Write-Host "`nTesting application responses..." -ForegroundColor Yellow

Write-Host "Testing main website:" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000" -TimeoutSec 10 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host " - Main website is responding (Status: $($response.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host " - Main website returned status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host " - Main website is not responding: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "Testing admin panel:" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3002" -TimeoutSec 10 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host " - Admin panel is responding (Status: $($response.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host " - Admin panel returned status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host " - Admin panel is not responding: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nSetup complete! Both applications should now be running and accessible through Nginx reverse proxy." -ForegroundColor Green
Write-Host "Note: Make sure Nginx is configured and running with the provided configuration." -ForegroundColor Yellow