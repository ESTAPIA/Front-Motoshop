const orderModel = require('../models/orderModel');
const { API_BASE_URL } = require('../../config/apiConfig');

const orderController = {
  // Método para mostrar todas las órdenes
  showOrders: async (req, res) => {
    try {
      res.render('orders/orders', {
        title: 'Mis Pedidos',
        apiBaseUrl: API_BASE_URL
      });
    } catch (error) {
      console.error('Error al cargar los pedidos:', error);
      res.status(500).render('error', { 
        message: 'Error al cargar los pedidos',
        error 
      });
    }
  },

  // Método para mostrar detalles de una orden
  showOrderDetails: async (req, res) => {
    try {
      const orderId = req.params.id;
      res.render('orders/order-details', {
        title: 'Detalle de Pedido',
        apiBaseUrl: API_BASE_URL,
        orderId
      });
    } catch (error) {
      console.error('Error al cargar el detalle del pedido:', error);
      res.status(500).render('error', { 
        message: 'Error al cargar el detalle del pedido',
        error 
      });
    }
  }
};

module.exports = orderController;
