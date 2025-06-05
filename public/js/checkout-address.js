$(function() {
  // Definir la URL base de la API
  const API_BASE_URL = window.API_BASE_URL || 'https://backmotos.onrender.com/api';
  
  // Verificar autenticación
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/?redirect=/checkout';
    return;
  }
  
  // Cargar la navbar adecuada
  const role = localStorage.getItem('role');
  const partial = role === 'ROLE_ADMIN' ? 'navbar-admin' : 'navbar-user';
  $('#navbar-container').load(`/partials/${partial}`);
  
  // Inicializar
  init();
  
  // Manejar formulario de dirección
  $('#address-form').on('submit', function(e) {
    e.preventDefault();
    
    const direccionEntrega = $('#shipping-address').val();
    if (!direccionEntrega.trim()) {
      showError('La dirección de entrega es obligatoria');
      return;
    }
    
    $('#error-message').hide();
    createPendingOrder(direccionEntrega);
  });
  
  // Función para inicializar
  function init() {
    // Verificar carrito
    verifyCart();
  }
  
  // Función para verificar que el carrito tenga productos
  function verifyCart() {
    $.ajax({
      url: `${API_BASE_URL}/carrito/count`,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        const itemCount = data.cantidad || 0;
        if (itemCount === 0) {
          // Carrito vacío, redirigir al catálogo
          showError('Tu carrito está vacío. Añade productos antes de continuar.');
          setTimeout(() => {
            window.location.href = '/catalog';
          }, 2000);
          return;
        }
        
        // Mostrar formulario
        $('#loading-checkout').hide();
        $('#address-form').show();
      },
      error: function(xhr) {
        handleApiError(xhr, 'Error al verificar el carrito');
      }
    });
  }
  
  // Función para crear un pedido pendiente
  function createPendingOrder(direccionEntrega) {
    // Mostrar cargando
    $('#address-form button[type="submit"]').prop('disabled', true).html(
      '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Procesando...'
    );
    
    $.ajax({
      url: `${API_BASE_URL}/proceso-pago/crear-pedido-pendiente`,
      type: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        direccionEntrega: direccionEntrega
      }),
      success: function(data) {
        // Redirigir al paso de pago con el ID del pedido
        window.location.href = `/checkout/payment/${data.idPedido}`;
      },
      error: function(xhr) {
        $('#address-form button[type="submit"]').prop('disabled', false).html('Continuar');
        handleApiError(xhr, 'Error al crear el pedido');
      }
    });
  }
  
  // Función para mostrar errores
  function showError(message) {
    $('#error-message').html(`<i class="bi bi-exclamation-triangle-fill me-2"></i>${message}`).show();
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
});
