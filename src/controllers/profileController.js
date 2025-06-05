const axios = require('axios');
const ProfileModel = require('../models/profileModel');

const profileController = {
  // Método para mostrar la página de perfil
  showProfile: async (req, res) => {
    try {
      // Obtén el token del usuario de la sesión o cookie
      // Por ahora asumiremos que es responsabilidad del cliente (JavaScript)
      // enviar el token en las peticiones a la API
      
      res.render('users/profile', { // Cambiado a la ruta correcta users/profile
        title: 'Mi Perfil',
        apiBaseUrl: process.env.API_BASE_URL || 'https://backmotos.onrender.com/api'
      });
    } catch (error) {
      console.error('Error al cargar el perfil:', error);
      res.status(500).render('error', { 
        message: 'Error al cargar la página de perfil',
        error 
      });
    }
  }
};

module.exports = profileController;
