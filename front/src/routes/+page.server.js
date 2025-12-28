export async function load({ fetch }) {
  try {
    console.log('🚀 Fetching markets from Strapi v5...');
    
    // STRAPI v5 API CALL - FLAT STRUCTURE
    const response = await fetch(
      'http://localhost:1337/api/markets?' +
      'populate[vendors][populate][0]=image' +
      '&populate[vendors][populate][1]=products' +
      '&populate[vendors][populate][products][populate][0]=image' +
      '&populate[vendors][populate][products][populate][1]=category'
    );


    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Strapi API Error:', response.status, errorText);
      return {
        allMarkets: { data: [] },
        error: `Failed to load markets: ${response.status}`
      };
    }

    const strapiResponse = await response.json();
    
    // Debug: Check what we received
    console.log('📦 Strapi Response Structure:', {
      hasData: !!strapiResponse.data,
      dataIsArray: Array.isArray(strapiResponse.data),
      dataLength: strapiResponse.data?.length || 0,
      firstMarket: strapiResponse.data?.[0]
    });

    // TRANSFORM STRAPI v5 FLAT DATA
    const markets = strapiResponse.data?.map(market => {
      // Market is flat in v5 - no .attributes
      const transformedMarket = {
        id: market.id,
        name: market.name || 'Unnamed Market',
        location: market.location || '',
        description: market.description || '',
        createdAt: market.createdAt,
        updatedAt: market.updatedAt,
        vendors: []  // Initialize empty vendors array
      };

      // Handle vendors if they exist
      if (market.vendors && Array.isArray(market.vendors)) {
        transformedMarket.vendors = market.vendors.map(vendor => {
          // Vendor is flat in v5 - no .attributes
          const transformedVendor = {
            id: vendor.id,
            name: vendor.name || 'Unnamed Vendor',
            description: vendor.description || '',
            contact: vendor.contact || '',
            email: vendor.email || '',
            verified: Boolean(vendor.verified),
            createdAt: vendor.createdAt,
            updatedAt: vendor.updatedAt,
            products: []  // Initialize empty products array
          };

          // Handle vendor image (flat structure)
          if (vendor.image) {
            transformedVendor.image = {
              id: vendor.image.id,
              name: vendor.image.name,
              url: vendor.image.url,
              formats: vendor.image.formats
            };
          }

          // Handle products if they exist
          if (vendor.products && Array.isArray(vendor.products)) {
            transformedVendor.products = vendor.products.map(product => {
              // Product is flat in v5 - no .attributes
              const transformedProduct = {
                id: product.id,
                name: product.name || 'Unnamed Product',
                description: product.description || '',
                price: Number(product.price) || 0,
                unit: product.unit || 'unit',
                category: product.category || '',
                stock: Number(product.stock) || 0,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt
              };

              // Handle product image (flat structure)
              if (product.image) {
                transformedProduct.image = {
                  id: product.image.id,
                  name: product.image.name,
                  url: product.image.url,
                  formats: product.image.formats
                };
              }

              // If category is an object (populated), extract name
              if (product.category && typeof product.category === 'object') {
                transformedProduct.category = product.category.name || '';
              }

              return transformedProduct;
            });
          }

          return transformedVendor;
        });
      }

      return transformedMarket;
    }) || [];

    console.log(`✅ Transformed ${markets.length} markets`);

    // Return in the exact structure your frontend expects
    return {
      allMarkets: {
        data: markets,
        meta: strapiResponse.meta || { pagination: { total: markets.length } }
      }
    };

  } catch (error) {
    console.error('💥 Unexpected error in load function:', error);
    return {
      allMarkets: { data: [] },
      error: 'An unexpected error occurred. Please try again.'
    };
  }
}