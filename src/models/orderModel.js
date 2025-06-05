const axios = require('axios');
const { API_BASE_URL } = require('../../config/apiConfig');

class OrderModel {
  constructor() {
    this.apiUrl = `${API_BASE_URL}/pedidos`;
  }

  // Obtener todas las órdenes del usuario
  async getUserOrders(token) {
    try {
      const response = await axios.get(`${this.apiUrl}/usuario`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener pedidos del usuario:', error);
      throw error;
    }
  }

  // Obtener detalles de una orden específica
  async getOrderById(orderId, token) {
    try {
      const response = await axios.get(`${this.apiUrl}/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error al obtener detalles del pedido ${orderId}:`, error);
      throw error;
    }
  }

  // Confirmar recepción de un pedido
  async confirmOrderDelivery(orderId, token) {
    try {
      const response = await axios.post(`${this.apiUrl}/${orderId}/confirmar-entrega`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error al confirmar entrega del pedido ${orderId}:`, error);
      throw error;
    }
  }
}

module.exports = new OrderModel();
