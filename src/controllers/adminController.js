/**
 * Controlador para el panel de administración
 */
const { API_BASE_URL } = require('../../config/apiConfig');

const adminController = {
  // Dashboard principal
  getDashboard: (req, res) => {
    res.render('admin/dashboard', {
      title: 'Panel de Administración',
      apiBaseUrl: API_BASE_URL
    });
  },
  
  // Gestión de usuarios
  getUsers: (req, res) => {
    res.render('admin/users', {
      title: 'Gestión de Usuarios',
      apiBaseUrl: API_BASE_URL
    });
  },
  
  getUserDetails: (req, res) => {
    const userId = req.params.id;
    res.render('admin/user-details', {
      title: 'Detalles de Usuario',
      userId,
      apiBaseUrl: API_BASE_URL
    });
  },
  
  // Gestión de productos
  getProducts: (req, res) => {
    res.render('admin/products', {
      title: 'Gestión de Productos',
      apiBaseUrl: API_BASE_URL
    });
  },
  
  getProductDetails: (req, res) => {
    const productId = req.params.id;
    res.render('admin/product-details', {
      title: 'Detalles de Producto',
      productId,
      apiBaseUrl: API_BASE_URL
    });
  },
  
  // Gestión de pedidos
  getOrders: (req, res) => {
    res.render('admin/orders', {
      title: 'Gestión de Pedidos',
      apiBaseUrl: API_BASE_URL
    });
  },
  
  getOrderDetails: (req, res) => {
    const orderId = req.params.id;
    res.render('admin/order-details', {
      title: 'Detalles de Pedido',
      orderId,
      apiBaseUrl: API_BASE_URL
    });
  },

  /**
   * Renderiza la página de gestión de facturas
   */
  renderFacturasPage: (req, res) => {
    res.render('admin/facturas');
  },

  // Métodos para las nuevas vistas de estadísticas
  showStockCritico: (req, res) => {
    res.render('admin/stock-critico', {
      title: 'Productos con Stock Crítico',
      pageTitle: 'Productos con Stock Crítico'
    });
  },

  showMasVendidos: (req, res) => {
    res.render('admin/mas-vendidos', {
      title: 'Productos Más Vendidos',
      pageTitle: 'Productos Más Vendidos'
    });
  }
};

module.exports = adminController;
