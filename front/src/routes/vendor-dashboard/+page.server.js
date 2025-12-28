import { redirect } from '@sveltejs/kit';

export const load = async ({ cookies, fetch }) => {
  const jwt = cookies.get('jwt');
  const vendorId = cookies.get('vendorId');
  
  if (!jwt) {
    throw redirect(302, '/vendor-login');
  }
  
  if (!vendorId) {
    throw redirect(302, '/vendor-registration?completeProfile=true');
  }
  
  try {
    // Get user data
    const userRes = await fetch('http://localhost:1337/api/users/me', {
      headers: { 'Authorization': `Bearer ${jwt}` }
    });
    
    if (!userRes.ok) {
      // Clear invalid cookies
      cookies.delete('jwt', { path: '/' });
      cookies.delete('vendorId', { path: '/' });
      throw redirect(302, '/vendor-login');
    }
    
    const user = await userRes.json();
    
    // Get vendor data
    const vendorRes = await fetch(
      `http://localhost:1337/api/vendors/${vendorId}?populate=*`,
      { headers: { 'Authorization': `Bearer ${jwt}` } }
    );
    
    let vendor = null;
    if (vendorRes.ok) {
      const vendorData = await vendorRes.json();
      vendor = vendorData.data || vendorData;
    } else {
      // Vendor not found, redirect to complete profile
      cookies.delete('vendorId', { path: '/' });
      throw redirect(302, '/vendor-registration?completeProfile=true');
    }
    
    // Get vendor's products
    let products = [];
    const productsRes = await fetch(
      `http://localhost:1337/api/products?filters[vendor][id][$eq]=${vendorId}&populate=*&sort=createdAt:desc`,
      { headers: { 'Authorization': `Bearer ${jwt}` } }
    );
    
    if (productsRes.ok) {
      const productsData = await productsRes.json();
      products = productsData.data || [];
    }
    
    // Get markets for dropdown
    let markets = [];
    try {
      const marketsRes = await fetch(
        `http://localhost:1337/api/markets?populate=*`,
        { headers: { 'Authorization': `Bearer ${jwt}` } }
      );
      
      if (marketsRes.ok) {
        const marketsData = await marketsRes.json();
        markets = marketsData.data || [];
      }
    } catch (marketError) {
      console.log('Market fetch error:', marketError);
    }
    
    return {
      user,
      vendor,
      products,
      markets,
      jwt // PASS JWT TO CLIENT - THIS IS CRITICAL
    };
    
  } catch (error) {
    if (error.status === 302) {
      throw error;
    }
    
    console.error('Dashboard load error:', error);
    cookies.delete('jwt', { path: '/' });
    cookies.delete('vendorId', { path: '/' });
    throw redirect(302, '/vendor-login');
  }
};