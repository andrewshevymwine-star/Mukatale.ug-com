'use strict';

module.exports = {
  register({ strapi }) {
    // 🔥 This fixes "Cannot send secure cookie over unencrypted connection"
    // on Render / any proxy that terminates HTTPS
    strapi.server.use(async (ctx, next) => {
      if (ctx.req?.socket) {
        ctx.req.socket.encrypted = true;
      }
      await next();
    });
  },

  bootstrap({ strapi }) {},
};