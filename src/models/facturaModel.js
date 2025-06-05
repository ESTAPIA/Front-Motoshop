const axios = require('axios');
const { API_BASE_URL } = require('../../config/apiConfig');

class FacturaModel {
  constructor() {
    this.apiUrl = `${API_BASE_URL}/facturas`;
  }

  // Obtener todas las facturas del usuario con el nuevo endpoint
  async getUserInvoices(token, page = 0, size = 10) {
    try {
      const response = await axios.get(`${this.apiUrl}/mis-facturas?page=${page}&size=${size}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error al obtener facturas del usuario:', error);
      throw error;
    }
  }

  // Obtener una factura específica (se mantiene por si es necesario)
  async getInvoiceById(invoiceId, token) {
    try {
      const response = await axios.get(`${this.apiUrl}/${invoiceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error al obtener factura ${invoiceId}:`, error);
      throw error;
    }
  }
}

module.exports = new FacturaModel();
