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
  // ✅ Strapi 5 correct proxy config (this is what was missing)
  proxy: { koa: true },

  // Public URL (Render gives you HTTPS, so we force it)
  url: env('PUBLIC_URL', 'https://mukatale-ug-com.onrender.com'),
});