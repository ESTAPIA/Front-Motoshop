const axios = require('axios');
const { API_BASE_URL } = require('../../config/apiConfig');

class CartModel {
  constructor() {
    this.apiUrl = `${API_BASE_URL}/carrito`;
  }

  // Obtener el carrito del usuario
  async getCart(token) {
    try {
      const response = await axios.get(this.apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener el carrito:', error);
      throw error;
    }
  }

  // Añadir producto al carrito
  async addToCart(productId, quantity, token) {
    try {
      const response = await axios.post(`${this.apiUrl}/agregar`, {
        productoId: productId,
        cantidad: quantity
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error al añadir producto al carrito:', error);
      throw error;
    }
  }

  // Actualizar cantidad de un producto en el carrito
  async updateCartItem(cartItemId, quantity, token) {
    try {
      const response = await axios.put(`${this.apiUrl}/actualizar/${cartItemId}`, {
        cantidad: quantity
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error al actualizar el carrito:', error);
      throw error;
    }
  }

  // Eliminar un producto del carrito
  async removeFromCart(cartItemId, token) {
    try {
      const response = await axios.delete(`${this.apiUrl}/eliminar/${cartItemId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error al eliminar producto del carrito:', error);
      throw error;
    }
  }
}

module.exports = new CartModel();
