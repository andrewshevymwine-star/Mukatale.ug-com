// lib/api.js
const API_URL = 'http://localhost:1337/api';

export async function apiRequest(endpoint, options = {}) {
  const { 
    method = 'GET', 
    data = null, 
    files = {}, 
    token = null,
    headers: customHeaders = {} 
  } = options;
  
  const headers = { ...customHeaders };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  let body = null;
  
  // Handle FormData for file uploads
  if (Object.keys(files).length > 0 || data?.files) {
    const formData = new FormData();
    
    // Add regular data
    if (data) {
      const cleanData = { ...data };
      delete cleanData.files; // Remove files from data object
      if (Object.keys(cleanData).length > 0) {
        formData.append('data', JSON.stringify(cleanData));
      }
    }
    
    // Add files from files object
    Object.entries(files).forEach(([field, file]) => {
      if (file) {
        formData.append(`files.${field}`, file);
      }
    });
    
    // Add files from data.files
    if (data?.files) {
      Object.entries(data.files).forEach(([field, file]) => {
        if (file) {
          formData.append(`files.${field}`, file);
        }
      });
    }
    
    body = formData;
  } else if (data) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body,
      credentials: 'include'
    });
    
    console.log(`API ${method} ${endpoint}:`, response.status);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: await response.text() };
      }
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Vendor-specific API helpers
export const vendorApi = {
  // Product operations
  async getProducts(vendorId, token) {
    return apiRequest(`/products?filters[vendors][id][$eq]=${vendorId}&populate=*`, { token });
  },
  
  async createProduct(productData, token) {
    return apiRequest('/products', {
      method: 'POST',
      data: productData,
      token
    });
  },
  
  async updateProduct(productId, productData, token) {
    return apiRequest(`/products/${productId}`, {
      method: 'PUT',
      data: productData,
      token
    });
  },
  
  async deleteProduct(productId, token) {
    return apiRequest(`/products/${productId}`, {
      method: 'DELETE',
      token
    });
  },
  
  // Vendor profile operations
  async updateVendor(vendorId, vendorData, token) {
    return apiRequest(`/vendors/${vendorId}`, {
      method: 'PUT',
      data: vendorData,
      token
    });
  },
  
  // Upload with files
  async uploadWithFiles(endpoint, data, files, token, method = 'POST') {
    return apiRequest(endpoint, {
      method,
      data,
      files,
      token
    });
  }
};