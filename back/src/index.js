'use strict';

module.exports = {
  async register({ strapi }) {},

  async bootstrap({ strapi }) {
    const publicRole = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } });

    const permissions = await strapi
      .query('plugin::users-permissions.permission')
      .findMany({ where: { role: publicRole.id } });

    const contentTypes = [
      'api::market.market',
      'api::vendor.vendor', 
      'api::product.product',
      'api::category.category',
    ];

    for (const contentType of contentTypes) {
      for (const action of ['find', 'findOne']) {
        const exists = permissions.some(
          p => p.action === `${contentType}.${action}`
        );
        if (!exists) {
          await strapi
            .query('plugin::users-permissions.permission')
            .create({
              data: {
                action: `${contentType}.${action}`,
                role: publicRole.id,
              },
            });
        }
      }
    }
  },
};