# PM2 Deployment Guide - Drama Streaming Website

## Overview
This guide documents the PM2 configuration and deployment process for the drama streaming website, including both the main website and admin panel.

## Port Configuration

### Main Website (dramatize)
- **Port**: 4000 (changed from 3000 to avoid conflict with nghttpx)
- **URL**: http://localhost:4000
- **Process Mode**: Cluster (4 instances)

### Admin Panel (dramatize-admin)
- **Port**: 3002
- **URL**: http://localhost:3002
- **Process Mode**: Fork (1 instance)

## Configuration Files

### Main Website - ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'dramatize',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 4000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'videos', 'analytics-data'],
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### Admin Panel - admin/ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'dramatize-admin',
    script: 'admin-server.js',
    cwd: 'd:\\website\\web 2\\admin',
    env: {
      NODE_ENV: 'development',
      PORT: 3002
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/admin-error.log',
    out_file: './logs/admin-out.log',
    log_file: './logs/admin-combined.log',
    time: true
  }]
};
```

## Environment Variables (.env)
```
# ===== SERVER PORTS =====
PORT=4000
ADMIN_PORT=3002

# ===== DOMAIN CONFIGURATION =====
DOMAIN=localhost:4000
ADMIN_DOMAIN=localhost:3002

# ===== CORS CONFIGURATION =====
CORS_ORIGIN=http://localhost:4000
```

## Deployment Commands

### Prerequisites
1. Install PM2 globally:
```bash
npm install -g pm2
```

### Starting Applications

1. **Start Main Website**:
```bash
cd d:\website\web 2
pm2 start ecosystem.config.js
```

2. **Start Admin Panel**:
```bash
cd d:\website\web 2
pm2 start admin/ecosystem.config.js
```

### Management Commands

- **Check Status**: `pm2 status`
- **View Logs**: `pm2 logs`
- **Restart All**: `pm2 restart all`
- **Stop All**: `pm2 stop all`
- **Delete All**: `pm2 delete all`
- **Monitor**: `pm2 monit`

### Specific Application Management

- **Restart Main Website**: `pm2 restart dramatize`
- **Restart Admin Panel**: `pm2 restart dramatize-admin`
- **View Main Website Logs**: `pm2 logs dramatize`
- **View Admin Panel Logs**: `pm2 logs dramatize-admin`

## Troubleshooting

### Port Conflicts
- **Issue**: EADDRINUSE errors
- **Solution**: Check which process is using the port with `netstat -an | Select-String ":PORT"`
- **Prevention**: Use different ports for each service

### Path Issues (Windows)
- **Issue**: Incorrect working directory paths
- **Solution**: Use Windows-style paths with double backslashes in ecosystem.config.js
- **Example**: `cwd: 'd:\\website\\web 2\\admin'`

### Log File Permissions
- **Issue**: Cannot create log files
- **Solution**: Ensure the logs directory exists and has write permissions
- **Auto-creation**: PM2 will create the logs directory automatically

## Verification Steps

1. **Check PM2 Status**:
```bash
pm2 status
```

2. **Verify Port Listening**:
```bash
netstat -an | Select-String ":4000|:3002"
```

3. **Test Website Accessibility**:
```bash
Invoke-WebRequest -Uri http://localhost:4000 -Method Head
Invoke-WebRequest -Uri http://localhost:3002 -Method Head
```

## Production Considerations

### Auto-Startup
To make PM2 start automatically on system boot:
```bash
pm2 startup
pm2 save
```

### Environment Variables
For production deployment, ensure:
- `NODE_ENV=production`
- Proper domain configurations
- SSL certificates if using HTTPS
- Firewall rules for port 3002 (admin panel)

### Security
- Admin panel should be behind authentication
- Consider VPN or IP restrictions for admin access
- Regular security updates for Node.js and dependencies

## Current Status
✅ Main website running on port 4000 (4 cluster instances)
✅ Admin panel running on port 3002 (1 fork instance)
✅ No port conflicts
✅ Both applications accessible
✅ PM2 process management active

## Support
For issues or questions, refer to:
- PM2 Documentation: https://pm2.keymetrics.io/
- Node.js Documentation: https://nodejs.org/
- Project-specific logs in the `logs/` directory