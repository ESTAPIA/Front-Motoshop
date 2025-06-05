const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');

// Middleware para verificar la autenticación en cada solicitud
router.use((req, res, next) => {
  // Comprueba si el usuario está en la sesión y pásalo a todas las vistas
  res.locals.user = req.session.user || null;
  next();
});

// Otras rutas que no sean del carrito...

module.exports = router;
