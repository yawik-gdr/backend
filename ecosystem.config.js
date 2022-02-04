module.exports = {
  apps : [{
    name: 'strapi',
    script: 'yarn',
    args: 'start',
    interpreter: '/bin/bash',
    env: {
      NODE_ENV: "development",
      PORT: 1337
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }],
  
  deploy : {
    production: {
      user : 'yawik',
      host : 'api.yawik.org',
      ref  : 'origin/main',
      repo : 'https://gitlab.com/yawik/backend.git',
      path : '/home/yawik/pm2',
      'pre-deploy-local' : 'rsync -a --delete /home/strapi/backend/build/ yawik@api.yawik.org:pm2/source/build/',
      'post-deploy' : 'pm2 startOrRestart ecosystem.config.js --interpreter bash --env production',
      'pre-setup': 'pm2 ps'
    },
    development: {
      user : 'yawik',
      host : 'localhost',
      ref  : 'origin/main',
      repo : 'https://gitlab.com/yawik/backend.git',
      path : '/home/strapi/pm2',
      'pre-deploy-local' : 'rsync -a --delete /home/strapi/backend/build/ /home/strapi/pm2/build/',
      'post-deploy' : 'pm2 startOrRestart ecosystem.config.js --interpreter bash --env development',
      'pre-setup': 'pm2 ps'
    }    
  }
};
