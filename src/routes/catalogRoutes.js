const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalogController');

// Ruta para mostrar el catálogo completo
router.get('/', catalogController.showCatalog);

// Ruta para ver detalles de un producto específico
router.get('/product/:id', catalogController.showProductDetails);

module.exports = router;
