// PM2 process definition for production.
// Start with:  pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "expenses-tracker",
      cwd: "./server",
      script: "src/index.js",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
    },
  ],
};
