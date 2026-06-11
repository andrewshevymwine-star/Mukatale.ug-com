'use strict';
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::vendor.vendor', ({ strapi }) => ({
  async update(ctx) {
    const { id } = ctx.params;
    const { data } = ctx.request.body;

    // Fetch existing vendor with product relations
    const existing = await strapi.documents('api::vendor.vendor').findOne({
      documentId: id,
      populate: ['products']
    });

    if (!existing) return ctx.notFound('Vendor not found');

    // Preserve products if caller didn't explicitly send the field
    const productsPayload = data.products !== undefined
      ? data.products
      : { connect: existing.products?.map(p => p.documentId) ?? [], disconnect: [] };

    const sanitized = await this.sanitizeInput(
      { ...data, products: productsPayload }, ctx
    );

    // Update and publish in one step using system privileges
    const result = await strapi.documents('api::vendor.vendor').update({
      documentId: id,
      data: sanitized,
      populate: ['products']
    });

    // Explicitly publish after update
    await strapi.documents('api::vendor.vendor').publish({
      documentId: id
    });

    return this.sanitizeOutput(result, ctx);
  }
}));