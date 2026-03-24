// back/config/server.js
module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET'),
    },
  },
  // Trust the proxy headers (Render sets X-Forwarded-Proto)
  proxy: true,
  // Set the public URL explicitly (use your full HTTPS URL)
  url: env('PUBLIC_URL', 'https://mukatale-ug-com.onrender.com'),
  
});