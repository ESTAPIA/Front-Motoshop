const express = require('express');
const router = express.Router();

// Ruta para ver todos los pedidos
router.get('/', (req, res) => {
  res.render('orders/list', { 
    title: 'Mis Pedidos',
    apiBaseUrl: process.env.API_BASE_URL || 'https://backmotos.onrender.com/api'
  });
});

// Ruta para ver detalle de un pedido específico
router.get('/:id', (req, res) => {
  res.render('orders/detail', { 
    title: 'Detalle del Pedido',
    orderId: req.params.id,
    apiBaseUrl: process.env.API_BASE_URL || 'https://backmotos.onrender.com/api'
  });
});

// Ruta para continuar con el pago de un pedido pendiente
router.get('/payment/:id', (req, res) => {
  res.render('checkout/payment', {
    title: 'Completar Pago',
    orderId: req.params.id,
    apiBaseUrl: process.env.API_BASE_URL || 'https://backmotos.onrender.com/api'
  });
});

module.exports = router;
