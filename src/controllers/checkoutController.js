const checkoutModel = require('../models/checkoutModel');
const { API_BASE_URL } = require('../../config/apiConfig');

const checkoutController = {
  // Método para mostrar la página de checkout
  showCheckout: async (req, res) => {
    try {
      res.render('checkout/checkout', {
        title: 'Finalizar Compra',
        apiBaseUrl: API_BASE_URL
      });
    } catch (error) {
      console.error('Error al cargar la página de checkout:', error);
      res.status(500).render('error', { 
        message: 'Error al cargar la página de finalizar compra',
        error 
      });
    }
  },

  // Método para mostrar la página de pago
  showPayment: async (req, res) => {
    try {
      const orderId = req.params.id;
      res.render('checkout/payment', {
        title: 'Pago',
        apiBaseUrl: API_BASE_URL,
        orderId
      });
    } catch (error) {
      console.error('Error al cargar la página de pago:', error);
      res.status(500).render('error', { 
        message: 'Error al cargar la página de pago',
        error 
      });
    }
  },

  // Método para mostrar la confirmación de pedido
  showConfirmation: async (req, res) => {
    try {
      const orderId = req.params.id;
      res.render('checkout/confirmation', {
        title: 'Confirmación de Pedido',
        apiBaseUrl: API_BASE_URL,
        orderId
      });
    } catch (error) {
      console.error('Error al cargar la página de confirmación:', error);
      res.status(500).render('error', { 
        message: 'Error al cargar la página de confirmación',
        error 
      });
    }
  }
};

module.exports = checkoutController;
