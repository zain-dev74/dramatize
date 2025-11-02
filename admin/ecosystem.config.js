module.exports = {
  apps: [{
    name: 'dramatize-admin',
    script: 'admin-server.js',
    cwd: '/home/dramatize.site/public_html/admin',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    error_file: '/home/dramatize.site/logs/admin-error.log',
    out_file: '/home/dramatize.site/logs/admin-out.log',
    log_file: '/home/dramatize.site/logs/admin-combined.log'
  }]
};