// Nanak Migration API — PM2 process file
// Usage (from project root): pm2 start ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: "nanak-migration-api",
      script: "src/server.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        PORT: 5001,
      },
      error_file: "/var/log/pm2/nanak-migration-api-error.log",
      out_file: "/var/log/pm2/nanak-migration-api-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
