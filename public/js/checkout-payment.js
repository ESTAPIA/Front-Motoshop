$(function() {
  // Verificar autenticación
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/?redirect=/checkout';
    return;
  }
  
  // Variables globales
  let orderId = getOrderIdFromUrl();
  let selectedAccount = null;
  
  // Cargar la navbar adecuada
  const role = localStorage.getItem('role');
  const partial = role === 'ROLE_ADMIN' ? 'navbar-admin' : 'navbar-user';
  $('#navbar-container').load(`/partials/${partial}`);
  
  // Inicializar
  init();
  
  // Event listeners
  $(document).on('click', '.account-card', function() {
    if ($(this).hasClass('insufficient')) return;
    
    $('.account-card').removeClass('selected');
    $(this).addClass('selected');
    
    selectedAccount = {
      cuentaId: parseInt($(this).data('account-id')),
      tipoCuenta: $(this).data('account-type')
    };
    
    // Habilitar botón de procesar pago
    $('#process-payment-btn').prop('disabled', false);
  });
  
  // Procesar pago
  $('#process-payment-btn').on('click', function() {
    if (!selectedAccount) return;
    
    // Mostrar cargando
    $(this).prop('disabled', true).html(
      '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Procesando...'
    );
    
    processPayment();
  });
  
  // Cancelar orden
  $('#cancel-order-btn, #cancel-no-accounts-btn').on('click', function() {
    if (confirm('¿Estás seguro de que deseas cancelar este pedido?')) {
      cancelOrder();
    }
  });
  
  // Función para inicializar
  function init() {
    if (!orderId) {
      showError('No se encontró el número de pedido');
      return;
    }
    
    // Verificar cuentas disponibles
    verifyAccounts();
  }
  
  // Función para verificar cuentas disponibles
  function verifyAccounts() {
    $.ajax({
      url: `${API_BASE_URL}/proceso-pago/verificar-cuentas/${orderId}`,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        $('#loading-payment').hide();
        
        // Mostrar resumen del pedido
        updateOrderSummary(data.infoPedido);
        
        if (data.tieneCuentas && data.cuentasConSaldo && data.cuentasConSaldo.length > 0) {
          // Mostrar selección de cuentas
          $('#account-selection').show();
          renderAccountOptions(data.cuentasConSaldo, data.cuentasSinSaldo, data.infoPedido.total);
        } else {
          // Mostrar mensaje de no hay cuentas
          $('#no-accounts-message').show();
        }
      },
      error: function(xhr) {
        handleApiError(xhr, 'Error al verificar cuentas bancarias');
      }
    });
  }
  
  // Función para renderizar opciones de cuentas
  function renderAccountOptions(accountsWithBalance, accountsWithoutBalance, orderTotal) {
    const $container = $('#accounts-container');
    $container.empty();
    
    // Cuentas con saldo suficiente
    accountsWithBalance.forEach(account => {
      $container.append(`
        <div class="account-card" data-account-id="${account.cuentaId}" data-account-type="${account.tipoCuenta}">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div class="account-type">${account.tipoCuenta}</div>
              <div class="text-muted small">Cuenta #${account.cuentaId}</div>
            </div>
            <div class="text-end">
              <div class="text-muted small">Saldo disponible</div>
              <div class="account-balance text-success">$${formatPrice(account.saldo)}</div>
            </div>
          </div>
        </div>
      `);
    });
    
    // Cuentas sin saldo suficiente
    if (accountsWithoutBalance && accountsWithoutBalance.length > 0) {
      $container.append('<div class="text-muted mb-2 mt-3">Cuentas con saldo insuficiente:</div>');
      
      accountsWithoutBalance.forEach(account => {
        $container.append(`
          <div class="account-card insufficient" title="Saldo insuficiente" data-account-id="${account.cuentaId}" data-account-type="${account.tipoCuenta}">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <div class="account-type">${account.tipoCuenta}</div>
                <div class="text-muted small">Cuenta #${account.cuentaId}</div>
              </div>
              <div class="text-end">
                <div class="text-muted small">Saldo disponible</div>
                <div class="account-balance text-warning">$${formatPrice(account.saldo)}</div>
                <div class="text-danger small mt-1">
                  <i class="bi bi-exclamation-triangle-fill me-1"></i>Saldo insuficiente
                </div>
              </div>
            </div>
          </div>
        `);
      });
    }
  }
  
  // Función para actualizar resumen del pedido
  function updateOrderSummary(orderInfo) {
    $('#order-id').text(orderInfo.idPedido);
    $('#order-address').text(orderInfo.direccionEntrega);
    $('#order-total').text(formatPrice(orderInfo.total));
    $('#order-summary').show();
  }
  
  // Función para procesar el pago
  function processPayment() {
    if (!selectedAccount) {
      $('#process-payment-btn').prop('disabled', false).text('Procesar Pago');
      showError('Por favor seleccione una cuenta bancaria');
      return;
    }
    
    $.ajax({
      url: `${API_BASE_URL}/proceso-pago/procesar-pago/${orderId}`,
      type: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(selectedAccount),
      success: function(data) {
        // Redirigir a la página de confirmación
        window.location.href = `/checkout/confirmation/${orderId}`;
      },
      error: function(xhr) {
        $('#process-payment-btn').prop('disabled', false).text('Procesar Pago');
        handleApiError(xhr, 'Error al procesar el pago');
      }
    });
  }
  
  // Función para cancelar orden
  function cancelOrder() {
    $.ajax({
      url: `${API_BASE_URL}/proceso-pago/cancelar-pedido/${orderId}`,
      type: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        showGlobalToast('success', 'Pedido cancelado correctamente');
        // Redireccionar al catálogo después de un breve momento
        setTimeout(() => {
          window.location.href = '/catalog';
        }, 1500);
      },
      error: function(xhr) {
        handleApiError(xhr, 'Error al cancelar el pedido');
      }
    });
  }
  
  // Función para obtener el ID del pedido de la URL
  function getOrderIdFromUrl() {
    const path = window.location.pathname;
    const matches = path.match(/\/checkout\/payment\/(\d+)$/);
    return matches ? parseInt(matches[1]) : null;
  }
  
  // Función para mostrar errores
  function showError(message) {
    $('#error-message').html(`<i class="bi bi-exclamation-triangle-fill me-2"></i>${message}`).show();
  }
  
  // Función para mostrar toast
  function showToast(type, message) {
    if (typeof window.showGlobalToast === 'function') {
      window.showGlobalToast(type, message);
    } else {
      alert(message);
    }
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
});
