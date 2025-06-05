const express = require('express');
const router = express.Router();
const facturaController = require('../controllers/facturaController');

// Ruta para mostrar todas las facturas
router.get('/', facturaController.showFacturas);

// Ruta para mostrar detalles de una factura
router.get('/:id', facturaController.showFacturaDetails);

module.exports = router;