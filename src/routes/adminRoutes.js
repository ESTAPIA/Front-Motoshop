/**
 * Rutas para el panel de administración
 */
const express = require('express');
const router = express.Router();

// Importar controladores
const adminController = require('../controllers/adminController');

// Rutas para el dashboard principal de administración
router.get('/dashboard', adminController.getDashboard);

// Rutas para gestión de usuarios
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserDetails);

// Rutas para gestión de productos
router.get('/products', adminController.getProducts);
router.get('/products/:id', adminController.getProductDetails);

// Rutas para gestión de pedidos
router.get('/orders', adminController.getOrders);
router.get('/orders/:id', adminController.getOrderDetails);

// Ruta para la gestión de facturas (admin)
router.get('/facturas', adminController.renderFacturasPage);

// Agregar las nuevas rutas para estadísticas
router.get('/stats/stock-critico', adminController.showStockCritico);
router.get('/stats/mas-vendidos', adminController.showMasVendidos);

module.exports = router;
