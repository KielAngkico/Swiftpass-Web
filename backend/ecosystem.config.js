module.exports = {
  apps: [
    {
      name: "swiftpass-api",
      script: "server.js",
      cwd: "/var/www/Swiftpass-Web/backend",
      watch: false,
      env: {
        NODE_ENV: "development",
      },
      error_file: "/var/log/pm2/swiftpass-api-error.log",
      out_file: "/var/log/pm2/swiftpass-api-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10
    }
  ]
};
