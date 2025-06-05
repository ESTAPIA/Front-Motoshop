const { API_BASE_URL } = require('../../config/apiConfig');

const homeController = {
  // Método para mostrar la página de inicio
  showHome: (req, res) => {
    try {
      res.render('home', {
        title: 'Inicio',
        apiBaseUrl: API_BASE_URL
      });
    } catch (error) {
      console.error('Error al cargar la página de inicio:', error);
      res.status(500).render('error', { 
        message: 'Error al cargar la página de inicio',
        error 
      });
    }
  }
};

module.exports = homeController;
