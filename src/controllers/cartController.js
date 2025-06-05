const cartModel = require('../models/cartModel');
const { API_BASE_URL } = require('../../config/apiConfig');

const cartController = {
  // Método para mostrar el carrito
  showCart: async (req, res) => {
    try {
      res.render('cart/cart', {
        title: 'Mi Carrito',
        apiBaseUrl: API_BASE_URL
      });
    } catch (error) {
      console.error('Error al cargar el carrito:', error);
      res.status(500).render('error', { 
        message: 'Error al cargar el carrito',
        error 
      });
    }
  }
};

module.exports = cartController;
