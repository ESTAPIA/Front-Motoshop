const express = require('express');
const router = express.Router();

// Ruta para la página de checkout (flujo de compra)
router.get('/', (req, res) => {
  res.render('checkout/index', { 
    title: 'Finalizar Compra',
    apiBaseUrl: process.env.API_BASE_URL || 'https://backmotos.onrender.com/api'
  });
});

module.exports = router;
