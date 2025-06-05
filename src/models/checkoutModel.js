const axios = require('axios');
const { API_BASE_URL } = require('../../config/apiConfig');

class CheckoutModel {
  constructor() {
    this.apiUrl = `${API_BASE_URL}/proceso-pago`;
  }

  // Verificar cuentas disponibles para pago
  async verifyAccounts(orderId, token) {
    try {
      const response = await axios.get(`${this.apiUrl}/verificar-cuentas/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error al verificar cuentas bancarias:', error);
      throw error;
    }
  }

  // Procesar el pago
  async processPayment(orderId, paymentData, token) {
    try {
      const response = await axios.post(`${this.apiUrl}/procesar-pago/${orderId}`, 
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error al procesar el pago:', error);
      throw error;
    }
  }

  // Cancelar una orden
  async cancelOrder(orderId, token) {
    try {
      const response = await axios.post(`${this.apiUrl}/cancelar-pedido/${orderId}`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error al cancelar el pedido:', error);
      throw error;
    }
  }
  
  // Crear nueva orden desde carrito
  async createOrderFromCart(shippingAddress, token) {
    try {
      const response = await axios.post(`${API_BASE_URL}/pedidos/crear`, 
        { direccionEntrega: shippingAddress },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error al crear la orden:', error);
      throw error;
    }
  }
}

module.exports = new CheckoutModel();
