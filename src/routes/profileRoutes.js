const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

// Ruta de perfil accesible tanto para usuarios normales como para administradores
router.get('/', profileController.showProfile);

module.exports = router;
