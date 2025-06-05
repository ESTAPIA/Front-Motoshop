const facturaModel = require('../models/facturaModel');
const { API_BASE_URL } = require('../../config/apiConfig');

const facturasController = {
  // Método para mostrar todas las facturas
  showInvoices: async (req, res) => {
    try {
      res.render('facturas/facturas', {
        title: 'Mis Facturas',
        apiBaseUrl: API_BASE_URL
      });
    } catch (error) {
      console.error('Error al cargar las facturas:', error);
      res.status(500).render('error', { 
        message: 'Error al cargar las facturas',
        error 
      });
    }
  },

  // Método para mostrar una factura específica
  showInvoiceDetails: async (req, res) => {
    try {
      const invoiceId = req.params.id;
      res.render('facturas/factura-details', {
        title: 'Detalle de Factura',
        apiBaseUrl: API_BASE_URL,
        invoiceId
      });
    } catch (error) {
      console.error('Error al cargar el detalle de la factura:', error);
      res.status(500).render('error', { 
        message: 'Error al cargar el detalle de la factura',
        error 
      });
    }
  }
};

module.exports = facturasController;
