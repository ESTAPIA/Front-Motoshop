const axios = require('axios');
const { API_BASE_URL } = require('../../config/apiConfig');

class CatalogModel {
  constructor() {
    this.apiUrl = `${API_BASE_URL}/productos`;
  }

  // Obtener todos los productos
  async getAllProducts(token) {
    try {
      const response = await axios.get(this.apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener productos:', error);
      throw error;
    }
  }

  // Obtener un producto por su ID
  async getProductById(productId, token) {
    try {
      const response = await axios.get(`${this.apiUrl}/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error al obtener producto con ID ${productId}:`, error);
      throw error;
    }
  }

  // Filtrar productos por categoría
  async getProductsByCategory(categoryId, token) {
    try {
      const response = await axios.get(`${this.apiUrl}/categoria/${categoryId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error al obtener productos de la categoría ${categoryId}:`, error);
      throw error;
    }
  }
}

module.exports = new CatalogModel();
