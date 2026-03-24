export default {
  register({ strapi }) {
    // This middleware forces Strapi to treat the request as HTTPS
    // when Render sends the X-Forwarded-Proto header
    strapi.server.use(async (ctx, next) => {
      const isHttps =
        ctx.get('X-Forwarded-Proto') === 'https' ||
        ctx.get('X-Forwarded-Protocol') === 'https' ||
        ctx.get('X-Forwarded-Ssl') === 'on';

      if (isHttps) {
        ctx.request.secure = true;
        ctx.protocol = 'https';
      }

      await next();
    });
  },
  bootstrap({ strapi }) {},
};