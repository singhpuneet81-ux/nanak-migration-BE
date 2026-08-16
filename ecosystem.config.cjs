# Nanak Migration API — PM2 process file
# Usage: pm2 start ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: "nanak-migration-api",
      script: "src/server.js",
      cwd: "/var/www/nanak-migration-BE",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        PORT: 5001,
      },
      error_file: "/var/log/pm2/nanak-migration-api-error.log",
      out_file: "/var/log/pm2/nanak-migration-api-out.log",
      time: true,
    },
  ],
};
