module.exports = {
  apps: [
    {
      name: 'md-searxng',
      cwd: __dirname,
      script: './pm2-docker-compose.sh',
      interpreter: 'none',
      autorestart: true,
      restart_delay: 5000,
      kill_timeout: 10000,
      env: {
        COMPOSE_PROJECT_NAME: 'md-n8n-searxng',
      },
    },
  ],
};
