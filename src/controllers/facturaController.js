const facturaModel = require('../models/facturaModel');
const { API_BASE_URL } = require('../../config/apiConfig');

const facturaController = {
  // Método para mostrar la página de facturas
  showFacturas: async (req, res) => {
    try {
      res.render('facturas/facturas', {
        title: 'Mis Facturas',
        apiBaseUrl: API_BASE_URL
      });
    } catch (error) {
      console.error('Error al cargar la página de facturas:', error);
      res.status(500).render('error', { 
        message: 'Error al cargar la página de facturas',
        error 
      });
    }
  },

  // Método para mostrar detalles de una factura
  showFacturaDetails: async (req, res) => {
    try {
      const facturaId = req.params.id;
      res.render('facturas/factura-detail', {
        title: 'Detalle de Factura',
        apiBaseUrl: API_BASE_URL,
        facturaId
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

module.exports = facturaController;
