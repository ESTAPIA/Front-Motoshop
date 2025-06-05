const { API_BASE_URL } = require('../../config/apiConfig');

const catalogController = {
  // Método para mostrar el catálogo de productos
  showCatalog: async (req, res) => {
    try {
      res.render('catalog/list', {  // Cambiando catalog/catalog por catalog/list
        title: 'Catálogo de Productos',
        apiBaseUrl: API_BASE_URL
      });
    } catch (error) {
      console.error('Error al cargar el catálogo:', error);
      res.status(500).render('error', { 
        message: 'Error al cargar el catálogo de productos',
        error 
      });
    }
  },
  
  // Método para mostrar detalles de un producto
  showProductDetails: async (req, res) => {
    try {
      const productId = req.params.id;
      res.render('catalog/detail', {
        title: 'Detalles del Producto',
        apiBaseUrl: API_BASE_URL,
        productId
      });
    } catch (error) {
      console.error('Error al cargar los detalles del producto:', error);
      res.status(500).render('error', { 
        message: 'Error al cargar los detalles del producto',
        error 
      });
    }
  }
};

module.exports = catalogController;
