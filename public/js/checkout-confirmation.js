$(function() {
  // Definir la URL base de la API
  const API_BASE_URL = window.API_BASE_URL || 'https://backmotos.onrender.com/api';
  
  // Verificar autenticación
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/?redirect=/checkout';
    return;
  }
  
  // Variables globales
  let orderId = getOrderIdFromUrl();
  
  // Cargar la navbar adecuada
  const role = localStorage.getItem('role');
  const partial = role === 'ROLE_ADMIN' ? 'navbar-admin' : 'navbar-user';
  $('#navbar-container').load(`/partials/${partial}`);
  
  // Inicializar
  init();
  
  // Función para inicializar
  function init() {
    if (!orderId) {
      showError('No se encontró el número de pedido');
      return;
    }
    
    // Cargar detalles del pedido
    loadOrderDetails();
  }
  
  // Función para cargar detalles del pedido
  function loadOrderDetails() {
    $.ajax({
      url: `${API_BASE_URL}/pedidos/${orderId}`,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        // Ocultar cargando
        $('#loading-confirmation').hide();
        
        // Mostrar detalles de confirmación
        $('#confirmation-order-id').text(data.idPedido);
        $('#confirmation-address').text(data.direccionEntrega);
        $('#confirmation-date').text(formatDate(data.fecha));
        $('#confirmation-payment').text(data.metodoPago);
        $('#confirmation-total').text(`$${formatPrice(data.total)}`);
        
        // Mostrar contenido de confirmación
        $('#confirmation-content').show();
      },
      error: function(xhr) {
        handleApiError(xhr, 'Error al cargar detalles del pedido');
      }
    });
  }
  
  // Función para obtener el ID del pedido de la URL
  function getOrderIdFromUrl() {
    const path = window.location.pathname;
    const matches = path.match(/\/checkout\/confirmation\/(\d+)$/);
    return matches ? parseInt(matches[1]) : null;
  }
  
  // Función para mostrar errores
  function showError(message) {
    $('#error-message').html(`<i class="bi bi-exclamation-triangle-fill me-2"></i>${message}`).show();
    $('#loading-confirmation').hide();
  }
  
  // Función para manejar errores de la API
  function handleApiError(xhr, defaultMessage) {
    console.error('Error API:', xhr);
    let errorMessage = defaultMessage;
    
    if (xhr.status === 401) {
      // Token expirado
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      window.location.href = '/?redirect=/checkout';
      return;
    }
    
    if (xhr.responseJSON && xhr.responseJSON.mensaje) {
      errorMessage = xhr.responseJSON.mensaje;
    } else if (xhr.responseJSON && xhr.responseJSON.error) {
      errorMessage = xhr.responseJSON.error;
    }
    
    showError(errorMessage);
  }
  
  // Función para formatear precio
  function formatPrice(price) {
    if (!price) return '0.00';
    return parseFloat(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }
  
  // Función para formatear fecha
  function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    // Formatear fecha como DD/MM/YYYY HH:MM
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
});
