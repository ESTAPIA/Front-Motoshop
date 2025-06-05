const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

// Ruta principal
router.get('/', homeController.showHome);

module.exports = router;
