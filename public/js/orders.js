$(function() {
  // Verificar autenticación
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/auth/login?redirect=/orders';
    return;
  }
  
  // Cargar la navbar adecuada
  loadNavbar();
  
  // Variables para paginación y filtrado
  let currentPage = 0;
  let pageSize = 10;
  let totalPages = 0;
  let statusFilter = '';
  let selectedAccountId = null;
  
  // Cargar pedidos iniciales
  loadOrders();
  
  // Event listeners para filtros
  $('#order-status').on('change', function() {
    statusFilter = $(this).val();
    currentPage = 0;
    loadOrders();
  });
  
  // Event delegation para elementos dinámicos - actualizado para cargar datos frescos
  $(document).on('click', '.complete-payment-btn', function() {
    const orderId = $(this).data('id');
    const orderTotal = $(this).data('total'); // orderTotal numérico original
    
    $('#pending-order-id').val(orderId);
    $('#order-amount').text('$' + formatPrice(orderTotal)); // Mostrar formateado
    
    // Almacenar el orderTotal numérico en el modal para su uso posterior
    $('#complete-payment-modal').data('currentOrderTotal', orderTotal);

    // Resetear campos y mostrar spinner de carga
    $('#current-address').text('Cargando...');
    $('#update-address-input').val('');
    
    // Mostrar modal y cargar cuentas bancarias
    $('#complete-payment-modal').modal('show');
    
    // Obtener los datos actualizados del pedido
    fetchOrderDetails(orderId, function(orderDetails) {
      // Actualizar la dirección mostrada con los datos más recientes
      $('#current-address').text(orderDetails.direccionEntrega || 'No especificada');
      $('#update-address-input').val(orderDetails.direccionEntrega || '');
    });
    
    loadBankAccounts(orderTotal);
  });
  
  // Corregir el manejo de clic en opciones de cuentas bancarias
  $(document).on('click', '.bank-account-option', function() {
    // Verificar si la cuenta está deshabilitada por fondos insuficientes
    if ($(this).hasClass('account-insufficient-funds')) {
      showToast('error', 'Esta cuenta no tiene fondos suficientes');
      return;
    }
    
    // Desmarcar todas las opciones
    $('.bank-account-option').removeClass('active');
    
    // Marcar la opción seleccionada
    $(this).addClass('active');
    
    // Guardar el ID de cuenta seleccionado
    selectedAccountId = $(this).data('account-id');
    console.log("Cuenta seleccionada: " + selectedAccountId);
    
    // Habilitar el botón de confirmación
    $('#confirm-complete-payment').prop('disabled', false);
  });
  
  // Manejar clic en botón de confirmar pago
  $('#confirm-complete-payment').on('click', function() {
    const orderId = $('#pending-order-id').val();
    const accountId = selectedAccountId;
    // Recuperar el orderTotal numérico directamente del atributo data del modal
    const orderTotal = $('#complete-payment-modal').data('currentOrderTotal');

    console.log("Ejecutando confirmación de pago - OrderID:", orderId, "AccountID:", accountId, "OrderTotal:", orderTotal);
    
    if (!orderId || !accountId) {
      showToast('error', 'Debe seleccionar una cuenta bancaria');
      return;
    }
    // Verificar si orderTotal es un número válido y no undefined
    if (typeof orderTotal !== 'number' || isNaN(orderTotal)) {
      showToast('error', 'No se pudo determinar el monto del pedido. Por favor, cierre el modal e intente de nuevo.');
      return;
    }
    
    completePayment(orderId, accountId, orderTotal);
  });
  
  // Manejar clic en el botón de cancelar pedido
  $(document).on('click', '#cancel-order-btn', function() {
    const orderId = $('#pending-order-id').val();
    
    if (!orderId) {
      showToast('error', 'ID de pedido no válido');
      return;
    }
    
    // Confirmar antes de cancelar
    if (confirm('¿Está seguro que desea cancelar este pedido? Esta acción no se puede deshacer.')) {
      cancelOrder(orderId);
    }
  });
  
  // Manejar el envío del formulario de actualización de dirección
  $(document).on('submit', '#update-address-form', function(e) {
    e.preventDefault();
    
    const orderId = $('#pending-order-id').val();
    const nuevaDireccion = $('#update-address-input').val().trim();
    
    if (!nuevaDireccion) {
      $('#address-update-error').text('Por favor ingrese una dirección válida').show();
      return;
    }
    
    updateOrderAddress(orderId, nuevaDireccion);
  });
  
  // Funciones
  function loadNavbar() {
    const role = localStorage.getItem('role');
    const partial = role === 'ROLE_ADMIN' ? 'navbar-admin' : 'navbar-user';
    $('#navbar-container').load(`/partials/${partial}`);
  }
  
  function loadOrders() {
    $('#loading-orders').show();
    $('#orders-container').hide();
    $('#no-orders-message').hide();
    
    // Construir URL base según si hay filtro de estado o no
    // Usar la ruta específica para filtrar por estado según la documentación
    let url;
    if (statusFilter) {
      url = `${window.API_BASE_URL}/pedidos/mis-pedidos/estado/${statusFilter}`;
    } else {
      url = `${window.API_BASE_URL}/pedidos/mis-pedidos`;
    }
    
    // Añadir parámetros de paginación
    url += `?page=${currentPage}&size=${pageSize}`;
    
    console.log('Cargando pedidos desde URL:', url);
    
    $.ajax({
      url: url,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        $('#loading-orders').hide();
        
        if (data && data.content && data.content.length > 0) {
          renderOrders(data.content);
          renderPagination(data);
          $('#orders-container').show();
        } else {
          $('#no-orders-message').show();
        }
      },
      error: function(xhr) {
        $('#loading-orders').hide();
        
        if (xhr.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          window.location.href = '/auth/login?redirect=/orders';
        } else {
          showToast('error', 'Error al cargar los pedidos: ' + (xhr.responseJSON?.error || xhr.statusText));
          $('#no-orders-message').show();
        }
      }
    });
  }
  
  function renderOrders(orders) {
    const $container = $('#orders-container');
    $container.empty();

    console.log('Datos de pedidos recibidos para renderizar:', orders); // DEBUG: Imprimir pedidos completos

    orders.forEach(order => {
      // Determinar color según estado
      let statusBadgeClass = 'bg-secondary';
      let iconClass = 'bi-clock';
      
      switch (order.estado) {
        case 'Pendiente':
          statusBadgeClass = 'bg-warning';
          iconClass = 'bi-hourglass-split';
          break;
        case 'Confirmado':
          statusBadgeClass = 'bg-success';
          iconClass = 'bi-check-circle-fill';
          break;
        case 'Enviado': // Suponiendo que existe este estado
          statusBadgeClass = 'bg-info';
          iconClass = 'bi-truck';
          break;
        case 'Entregado': // Suponiendo que existe este estado
          statusBadgeClass = 'bg-primary';
          iconClass = 'bi-box-seam-fill';
          break;
        case 'Cancelado':
          statusBadgeClass = 'bg-danger';
          iconClass = 'bi-x-circle-fill';
          break;
      }

      // Formatear fecha
      const fecha = new Date(order.fecha);
      const fechaFormateada = fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Construir HTML para cada pedido
      let html = `
        <div class="card mb-3 order-card" data-status="${order.estado}" data-order-id="${order.idPedido}">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>
              <strong>Pedido #${order.idPedido}</strong> 
              <span class="badge ${statusBadgeClass} ms-2">
                <i class="bi ${iconClass} me-1"></i>${order.estado}
              </span>
            </span>
            <span class="text-muted"><i class="bi bi-calendar3 me-1"></i>${fechaFormateada}</span>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-8">
                <p><strong>Dirección:</strong> <span class="order-address">${order.direccionEntrega || 'No especificada'}</span></p>
                <p><strong>Método de pago:</strong> ${order.metodoPago || 'Pendiente'}</p>
      `;
      
      // Si hay detalles, mostrar resumen de productos
      if (order.detalles && order.detalles.length > 0) {
        let detallesHtml = '<ul class="list-group list-group-flush">';
        order.detalles.forEach(detalle => {
          console.log('Detalle del pedido:', detalle); // DEBUG: Imprimir cada detalle
          
          // Acceder al nombre del producto y la URL de la imagen desde el DTO
          const nombreProducto = detalle.prodNombre || 'Nombre no disponible';
          const imagenUrl = detalle.prodUrlImagen || '/img/no-image.png';
          
          console.log('Nombre Producto (desde DTO):', nombreProducto); // DEBUG
          console.log('URL Imagen (desde DTO):', imagenUrl); // DEBUG

          detallesHtml += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <div class="d-flex align-items-center">
                <img src="${imagenUrl}" alt="${nombreProducto}" class="img-fluid rounded me-3" style="width: 50px; height: 50px; object-fit: cover;">
                <div>
                  <strong>${nombreProducto}</strong> (ID: ${detalle.idProducto})
                  <br>
                  <small>Cantidad: ${detalle.cantidad} x $${formatPrice(detalle.precioUnitario)}</small>
                </div>
              </div>
              <span>$${formatPrice(detalle.cantidad * detalle.precioUnitario)}</span>
            </li>
          `;
        });
        detallesHtml += '</ul>';
        
        html += `
                <div class="mt-2">
                  <strong>Productos:</strong>
                  ${detallesHtml}
                </div>
        `;
      } else {
        html += `
                <div class="mt-2">
                  <strong>Productos:</strong>
                  <p>No hay detalles para este pedido.</p>
                </div>
        `;
      }
      
      html += `
              </div>
              <div class="col-md-4 text-end">
                <h4 class="mb-3">$${formatPrice(order.total)}</h4>
      `;
      
      // Si el pedido está pendiente, mostrar botón para completar pago con dirección
      if (order.estado === 'Pendiente') {
        html += `
                <button class="btn btn-primary complete-payment-btn" 
                       data-id="${order.idPedido}" 
                       data-total="${order.total}"
                       data-address="${order.direccionEntrega || ''}">
                  <i class="bi bi-credit-card me-1"></i>Completar pago
                </button>
        `;
      }
      
      html += `
              </div>
            </div>
          </div>
        </div>
      `;
      
      $container.append(html);
    });
  }
  
  function renderPagination(data) {
    const $pagination = $('#pagination');
    $pagination.empty();
    
    totalPages = data.totalPages || 1;
    
    if (totalPages <= 1) return;
    
    // Botón "Anterior"
    $pagination.append(`
      <li class="page-item ${currentPage === 0 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage - 1}">&laquo;</a>
      </li>
    `);
    
    // Botones de números de página
    for (let i = 0; i < totalPages; i++) {
      if (totalPages > 7 && i > 1 && i < totalPages - 2) {
        // Si hay muchas páginas, mostrar puntos suspensivos
        if (i === 2) {
          $pagination.append('<li class="page-item disabled"><span class="page-link">...</span></li>');
        }
        continue;
      }
      
      $pagination.append(`
        <li class="page-item ${i === currentPage ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${i}">${i + 1}</a>
        </li>
      `);
    }
    
    // Botón "Siguiente"
    $pagination.append(`
      <li class="page-item ${currentPage === totalPages - 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage + 1}">&raquo;</a>
      </li>
    `);
    
    // Event listener para cambios de página
    $pagination.find('.page-link').on('click', function(e) {
      e.preventDefault();
      const page = parseInt($(this).data('page'));
      
      if (!isNaN(page) && page >= 0 && page < totalPages) {
        currentPage = page;
        loadOrders();
      }
    });
  }
  
  function loadBankAccounts(orderTotal) {
    $('#payment-loading').show();
    $('#accounts-container').hide();
    $('#no-accounts-message').hide();
    
    // Usar la ruta específica para obtener cuentas bancarias del usuario
    $.ajax({
      url: `${window.API_BASE_URL}/cuentas-bancarias/mis-cuentas`,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        console.log("Respuesta de cuentas bancarias:", data); // Para depuración
        $('#payment-loading').hide();
        $('#accounts-container').show();
        
        if (Array.isArray(data) && data.length > 0) {
          renderBankAccounts(data, orderTotal);
        } else {
          $('#no-accounts-message').show();
          $('#confirm-complete-payment').prop('disabled', true);
        }
      },
      error: function(xhr) {
        console.error("Error al cargar cuentas:", xhr); // Para depuración
        $('#payment-loading').hide();
        $('#no-accounts-message').show();
        showToast('error', 'Error al cargar las cuentas bancarias: ' + (xhr.responseJSON?.error || xhr.statusText));
      }
    });
  }
  
  function renderBankAccounts(accounts, orderTotal) {
    const $container = $('#bank-accounts-list');
    $container.empty();
    
    let hasSufficientBalance = false;
    
    console.log("Cuentas recibidas:", accounts); // Para depuración
    
    if (!Array.isArray(accounts) || accounts.length === 0) {
      $container.html(`
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          No se encontraron cuentas bancarias disponibles.
        </div>
      `);
      return;
    }
    
    accounts.forEach(account => {
      const hasFunds = account.saldo >= orderTotal;
      const disabledClass = hasFunds ? '' : 'account-insufficient-funds';
      const statusIcon = hasFunds 
        ? '<i class="bi bi-check-circle-fill text-success"></i>' 
        : '<i class="bi bi-exclamation-circle-fill text-danger"></i>';
        
      if (hasFunds) hasSufficientBalance = true;
        
      $container.append(`
        <div class="list-group-item list-group-item-action bank-account-option ${disabledClass}" 
                data-account-id="${account.cuentaId}"
                data-tipo-cuenta="${account.tipoCuenta}">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="mb-1">Cuenta ${account.tipoCuenta}</h6>
              <small class="text-muted">ID: ${account.cuentaId}</small>
            </div>
            <div class="text-end">
              <span class="badge ${hasFunds ? 'bg-success' : 'bg-danger'}">$${formatPrice(account.saldo)}</span>
              ${statusIcon}
              ${hasFunds ? 
                '<span class="ms-2 selectable-indicator"><i class="bi bi-check2-circle opacity-0"></i></span>' : 
                '<small class="text-danger d-block">Saldo insuficiente</small>'}
            </div>
          </div>
        </div>
      `);
    });
    
    if (!hasSufficientBalance) {
      $container.append(`
        <div class="alert alert-warning mt-3">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          Ninguna de sus cuentas tiene saldo suficiente para completar este pago.
        </div>
      `);
    }
  }
  
  function completePayment(orderId, accountId, orderTotal) {    
    const tipoCuenta = $('.bank-account-option.active').data('tipo-cuenta');

    if (!tipoCuenta) {
      showToast('error', 'No se pudo obtener el tipo de cuenta seleccionado. Por favor, intente de nuevo.');
      $('#confirm-complete-payment').prop('disabled', false).html('Confirmar pago');
      return;
    }
    
    const params = new URLSearchParams({
        cuentaId: accountId,
        tipoCuenta: tipoCuenta,
        clearCart: false // Siempre false para pagos desde la página de pedidos
    });

    console.log('Completando pago desde orders.js. URL de la API:', `${window.API_BASE_URL}/proceso-pago/confirmar-pago/${orderId}?${params.toString()}`);
    console.log('ID del Pedido (orderId):', orderId);
    console.log('ID de la Cuenta (accountId):', accountId);
    console.log('Tipo de Cuenta (tipoCuenta) enviado:', tipoCuenta);

    // Usar la nueva ruta para completar pagos pendientes con método de pago correcto
    $.ajax({
      url: `${window.API_BASE_URL}/proceso-pago/confirmar-pago/${orderId}?${params.toString()}`,
      type: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        $('#complete-payment-modal').modal('hide');
        
        // En lugar de toast y recarga directa, mostrar el nuevo modal
        showToast('success', 'Pago completado con éxito');
        
        // Recargar la página después de un breve momento y filtrar por confirmados
        setTimeout(() => {
          statusFilter = 'Confirmado';
          $('#order-status').val('Confirmado');
          currentPage = 0;
          loadOrders();
        }, 1500);
      },
      error: function(xhr) {
        $('#confirm-complete-payment').prop('disabled', false).html('Confirmar pago');
        
        let errorMsg = 'Error al procesar el pago';
        if (xhr.responseJSON && xhr.responseJSON.error) {
          errorMsg = xhr.responseJSON.error;
        } else if (xhr.responseJSON && xhr.responseJSON.mensaje) {
          errorMsg = xhr.responseJSON.mensaje;
        }
        
        // Verificar específicamente si es un error de stock insuficiente
        if (errorMsg.includes('Stock insuficiente') || errorMsg.includes('al actualizar el stock del producto')) {
          // Mostrar un mensaje de error más descriptivo
          showStockErrorAlert(errorMsg);
        } else {
          // Para otros errores, mostrar el mensaje normal
          showToast('error', errorMsg);
        }
      }
    });
  }
  
  // Nueva función para mostrar mensaje de error de stock más informativo en lugar del modal invasivo
  function showStockErrorAlert(errorMsg) {
    // Eliminar alertas previas si existen
    $('#stock-error-alert').remove();
    
    // Crear una alerta descriptiva
    const alertHtml = `
      <div id="stock-error-alert" class="alert alert-warning alert-dismissible fade show mt-3" role="alert">
        <h5 class="alert-heading"><i class="bi bi-exclamation-triangle-fill me-2"></i>Acción requerida</h5>
        <p>${errorMsg}</p>
        <p><strong>Debido a un cambio en el inventario, este pedido no puede ser completado.</strong></p>
        <p>Por favor cancele este pedido y cree uno nuevo con los productos disponibles actualmente.</p>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
    
    // Insertar la alerta antes de la lista de cuentas bancarias
    $('#bank-accounts-list').before(alertHtml);
    
    // Hacer scroll hacia la alerta para asegurarse de que sea visible
    $('html, body').animate({
      scrollTop: $("#stock-error-alert").offset().top - 100
    }, 200);
  }
  
  // Mantener las demás funciones pero quitamos las que ya no usaremos
  // Eliminamos showCancelOrderInstructionsModal y cancelOrderDueToStock
  // que eran las que mostraban el modal invasivo
  
  function cancelOrder(orderId) {
    $.ajax({
      url: `${window.API_BASE_URL}/pedidos/${orderId}/cancelar`,
      type: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        $('#complete-payment-modal').modal('hide');
        
        showToast('success', 'Pedido cancelado correctamente');
        
        // Recargar los pedidos para ver el cambio de estado
        setTimeout(() => {
          loadOrders();
        }, 1000);
      },
      error: function(xhr) {
        let errorMsg = 'Error al cancelar el pedido';
        if (xhr.responseJSON && xhr.responseJSON.error) {
          errorMsg = xhr.responseJSON.error;
        }
        
        showToast('error', errorMsg);
      }
    });
  }
  
  // Nueva función para obtener detalles actualizados de un pedido
  function fetchOrderDetails(orderId, callback) {
    $.ajax({
      url: `${window.API_BASE_URL}/pedidos/${orderId}`,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        if (callback && typeof callback === 'function') {
          callback(data);
        }
      },
      error: function(xhr) {
        showToast('error', 'Error al obtener los detalles del pedido');
      }
    });
  }
  
  // Función para actualizar la dirección - modificada para actualizar también el botón
  function updateOrderAddress(orderId, nuevaDireccion) {
    $('#update-address-btn').prop('disabled', true).html(
      '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Actualizando...'
    );
    
    $.ajax({
      url: `${window.API_BASE_URL}/pedidos/${orderId}/direccion?nuevaDireccion=${encodeURIComponent(nuevaDireccion)}`,
      type: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        // 1. Actualizar la dirección mostrada en el modal
        $('#current-address').text(nuevaDireccion);
        
        // 2. Actualizar el atributo data-address del botón que abre el modal
        // para que tenga la dirección actualizada en futuras aperturas
        $(`.complete-payment-btn[data-id="${orderId}"]`).data('address', nuevaDireccion);
        
        // 3. Actualizar también la dirección visible en la tarjeta de pedido si existe
        const orderCard = $(`.order-card[data-order-id="${orderId}"]`);
        if (orderCard.length) {
          orderCard.find('.order-address').text(nuevaDireccion || 'No especificada');
        }
        
        // Cerrar el collapse de actualizar dirección
        $('#collapseUpdateAddress').collapse('hide');
        
        // Mostrar mensaje de éxito
        showToast('success', 'Dirección actualizada correctamente');
        
        // Reiniciar botón
        $('#update-address-btn').prop('disabled', false).html('Actualizar dirección');
      },
      error: function(xhr) {
        let errorMsg = 'Error al actualizar la dirección';
        if (xhr.responseJSON && xhr.responseJSON.error) {
          errorMsg = xhr.responseJSON.error;
        }
        
        $('#address-update-error').text(errorMsg).show();
        $('#update-address-btn').prop('disabled', false).html('Actualizar dirección');
      }
    });
  }
  
  function formatPrice(price) {
    if (!price) return '0.00';
    return parseFloat(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }
  
  function showToast(type, message) {
    // Usar la función global de toast si está disponible
    if (typeof window.showGlobalToast === 'function') {
      window.showGlobalToast(type, message);
    } else {
      // Fallback si no está disponible la función global
      const toastClass = type === 'success' ? 'bg-success' : 'bg-danger';
      const icon = type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill';
      
      const toastHtml = `
        <div class="toast align-items-center ${toastClass} text-white" role="alert" aria-live="assertive" aria-atomic="true">
          <div class="d-flex">
            <div class="toast-body">
              <i class="bi ${icon} me-2"></i> ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
        </div>
      `;
      
      // Verificar si existe el contenedor de toast, si no, crearlo
      if (!$('#toast-container').length) {
        $('body').append('<div id="toast-container" class="toast-container position-fixed bottom-0 end-0 p-3"></div>');
      }
      
      $('#toast-container').append(toastHtml);
      const toastElement = $('.toast').last()[0];
      const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
      toast.show();
    }
  }
});
