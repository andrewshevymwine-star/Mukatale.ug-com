module.exports = (plugin) => {
    plugin.controllers.vendor = {
      async me(ctx) {
        const user = ctx.state.user;
        
        if (!user) {
          return ctx.unauthorized('You must be logged in');
        }
  
        const vendor = await strapi.entityService.findMany('api::vendor.vendor', {
          filters: { user: user.id },
          populate: ['image', 'market', 'vendor_products.product.image']
        });
  
        if (!vendor || vendor.length === 0) {
          return ctx.notFound('Vendor profile not found');
        }
  
        return vendor[0];
      }
    };
  
    plugin.routes['content-api'].routes.push({
      method: 'GET',
      path: '/vendors/me',
      handler: 'vendor.me',
      config: {
        prefix: '',
        policies: []
      }
    });
  
    return plugin;
  };