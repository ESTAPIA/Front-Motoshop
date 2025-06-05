$(function() {
  // Verificar autenticación de administrador
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  
  if (!token) {
    window.location.href = '/auth/login?redirect=/admin/orders';
    return;
  }
  
  if (role !== 'ROLE_ADMIN') {
    window.location.href = '/';
    return;
  }
  
  // Variables para paginación y filtrado
  let currentPage = 0;
  let pageSize = 10;
  let totalPages = 0;
  let statusFilter = ''; // Vacío significa todos
  let sortField = 'idPedido'; // Campo por defecto para ordenar
  
  // Cargar navbar y pedidos iniciales
  loadNavbar();
  loadOrders();
  
  // Event listeners
  // Listener para el cambio de estado del pedido
  $('#order-status').on('change', function() {
    statusFilter = $(this).val();
    currentPage = 0;
    loadOrders();
  });
  
  // Botón de actualizar
  $('#refresh-btn').on('click', function() {
    statusFilter = '';
    $('#order-status').val('');
    currentPage = 0;
    loadOrders();
  });
  
  // Event delegation para el botón "Ver detalles"
  $(document).on('click', '.view-order-details', function(e) {
    e.preventDefault();
    const orderId = $(this).data('id');
    loadOrderDetails(orderId);
  });
  
  // Event delegation para el botón "Cambiar estado"
  $(document).on('click', '.change-status-btn', function(e) {
    e.preventDefault();
    const orderId = $(this).data('id');
    const currentStatus = $(this).data('status');
    showChangeStatusModal(orderId, currentStatus);
  });
  
  // Botón para confirmar cambio de estado
  $('#confirm-status-change').on('click', function() {
    const orderId = $('#order-id').val();
    const newStatus = $('#new-status').val();
    const nuevaDireccion = $('#new-address').val().trim();
    
    const currentStatus = $('#current-status').val();
    
    // Solo permitir edición para pedidos pendientes
    if (currentStatus !== 'Pendiente') {
      $('#status-error').text('Este pedido no puede ser modificado').show();
      return;
    }
    
    // Verificar si hay algún cambio
    if (!newStatus && !nuevaDireccion) {
      $('#status-error').text('No ha realizado ningún cambio').show();
      return;
    }
    
    changeOrderStatus(orderId, newStatus, nuevaDireccion);
  });
  
  // Funciones
  function loadNavbar() {
    $('#navbar-container').load('/partials/navbar-admin');
  }
  
  function loadOrders() {
    $('#loading-orders').show();
    $('#orders-table-container').hide();
    $('#no-orders-message').hide();
    
    // Construir URL base según el filtro de estado
    let url = `${window.API_BASE_URL}/admin/pedidos/todos?page=${currentPage}&size=${pageSize}&sort=${sortField}`;
    
    if (statusFilter) {
      // Si hay filtro, adaptar la URL para filtrar por estado
      url = `${window.API_BASE_URL}/admin/pedidos/estado/${statusFilter}?page=${currentPage}&size=${pageSize}&sort=${sortField}`;
    }
    
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
          $('#orders-table-container').show();
        } else {
          $('#no-orders-message').show();
        }
      },
      error: function(xhr) {
        $('#loading-orders').hide();
        
        if (xhr.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          window.location.href = '/auth/login?redirect=/admin/orders';
        } else {
          showToast('error', 'Error al cargar los pedidos: ' + (xhr.responseJSON?.mensaje || xhr.statusText));
          $('#no-orders-message').show();
        }
      }
    });
  }
  
  function renderOrders(orders) {
    const $tbody = $('#orders-table-body');
    $tbody.empty();
    
    orders.forEach(order => {
      // Formatear fecha
      const fecha = new Date(order.fecha);
      const fechaFormateada = fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Estado del pedido con colores
      let statusClass;
      switch (order.estado) {
        case 'Pendiente':
          statusClass = 'bg-warning text-dark';
          break;
        case 'Confirmado':
          statusClass = 'bg-success';
          break;
        case 'Cancelado':
          statusClass = 'bg-danger';
          break;
        default:
          statusClass = 'bg-secondary';
      }
      
      // Botones de acción diferentes según el estado del pedido
      let actionButtons = '';
      
      if (order.estado === 'Pendiente') {
        // Solo pedidos pendientes pueden ser editados
        actionButtons = `
          <button class="btn btn-primary change-status-btn" data-id="${order.idPedido}" data-status="${order.estado}">
            <i class="bi bi-pencil"></i> Editar Pedido
          </button>
        `;
      }
      
      // Todos los pedidos pueden verse en detalle
      actionButtons += `
        <button class="btn btn-outline-info view-order-details" data-id="${order.idPedido}">
          <i class="bi bi-eye"></i> Ver Detalles
        </button>
      `;
      
      $tbody.append(`
        <tr>
          <td>${order.idPedido}</td>
          <td>${fechaFormateada}</td>
          <td>${order.cliCedula}</td>
          <td>
            <span class="badge ${statusClass}">
              ${order.estado}
            </span>
          </td>
          <td>${order.metodoPago || 'No especificado'}</td>
          <td>$${formatPrice(order.total)}</td>
          <td>
            <div class="btn-group btn-group-sm" role="group">
              ${actionButtons}
            </div>
          </td>
        </tr>
      `);
    });
  }
  
  function loadOrderDetails(orderId) {
    // Mostrar modal y spinner de carga
    $('#order-detail-modal').modal('show');
    $('#order-detail-loading').show();
    $('#order-detail-content').hide();
    
    // Buscar el pedido en la misma API que usamos para cargar todos
    $.ajax({
      url: `${window.API_BASE_URL}/admin/pedidos/todos?page=0&size=100`,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        const order = data.content.find(o => o.idPedido == orderId);
        
        if (order) {
          $('#order-detail-loading').hide();
          renderOrderDetailContent(order);
          $('#order-detail-content').show();
        } else {
          $('#order-detail-loading').hide();
          $('#order-detail-content').html(`
            <div class="alert alert-warning">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              No se encontró el pedido con ID ${orderId}
            </div>
          `).show();
        }
      },
      error: function(xhr) {
        $('#order-detail-loading').hide();
        
        let errorMsg = 'Error al cargar los detalles del pedido';
        if (xhr.responseJSON && xhr.responseJSON.mensaje) {
          errorMsg = xhr.responseJSON.mensaje;
        }
        
        $('#order-detail-content').html(`
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            ${errorMsg}
          </div>
        `).show();
      }
    });
  }
  
  function renderOrderDetailContent(order) {
    // Formatear fecha
    const fecha = new Date(order.fecha);
    const fechaFormateada = fecha.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Estado del pedido con colores
    let statusClass;
    switch (order.estado) {
      case 'Pendiente':
        statusClass = 'bg-warning text-dark';
        break;
      case 'Confirmado':
        statusClass = 'bg-success';
        break;
      case 'Cancelado':
        statusClass = 'bg-danger';
        break;
      default:
        statusClass = 'bg-secondary';
    }
    
    // Construir HTML para los detalles del pedido
    let detallesHTML = '';
    if (order.detalles && order.detalles.length > 0) {
      detallesHTML = `
        <h5 class="mt-4">Productos</h5>
        <div class="table-responsive">
          <table class="table table-sm table-striped">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Descripción</th>
                <th class="text-center">Cantidad</th>
                <th class="text-end">Precio</th>
                <th class="text-end">Subtotal</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      order.detalles.forEach(detalle => {
        // Calcular subtotal ya que viene null
        const subtotal = detalle.cantidad * detalle.precioUnitario;
        detallesHTML += `
          <tr>
            <td>${detalle.productoNombre || detalle.prodNombre || 'Producto'}</td>
            <td>${detalle.productoDescripcion || '-'}</td>
            <td class="text-center">${detalle.cantidad}</td>
            <td class="text-end">$${formatPrice(detalle.precioUnitario)}</td>
            <td class="text-end">$${formatPrice(subtotal)}</td>
          </tr>
        `;
      });
      
      detallesHTML += `
            </tbody>
            <tfoot>
              <tr>
                <th colspan="4" class="text-end">Total:</th>
                <th class="text-end">$${formatPrice(order.total)}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    } else {
      detallesHTML = `<div class="alert alert-info mt-3">No hay detalles disponibles para este pedido.</div>`;
    }
    
    // Mostrar toda la información del pedido
    $('#order-detail-content').html(`
      <div class="row">
        <div class="col-md-6">
          <h5>Información del Pedido</h5>
          <table class="table table-sm">
            <tr>
              <th>ID Pedido:</th>
              <td>${order.idPedido}</td>
            </tr>
            <tr>
              <th>Cliente:</th>
              <td>${order.cliCedula}</td>
            </tr>
            <tr>
              <th>Fecha:</th>
              <td>${fechaFormateada}</td>
            </tr>
            <tr>
              <th>Estado:</th>
              <td><span class="badge ${statusClass}">${order.estado}</span></td>
            </tr>
            <tr>
              <th>Total:</th>
              <td class="fw-bold">$${formatPrice(order.total)}</td>
            </tr>
          </table>
        </div>
        <div class="col-md-6">
          <h5>Información de Entrega y Pago</h5>
          <table class="table table-sm">
            <tr>
              <th>Dirección:</th>
              <td>${order.direccionEntrega || 'No especificada'}</td>
            </tr>
            <tr>
              <th>Método de Pago:</th>
              <td>${order.metodoPago || 'No especificado'}</td>
            </tr>
          </table>
        </div>
      </div>
      ${detallesHTML}
    `);
  }
  
  function showChangeStatusModal(orderId, currentStatus) {
    // Configurar el modal
    $('#order-id').val(orderId);
    $('#current-status').val(currentStatus);
    $('#current-status-display').text(currentStatus);
    $('#status-error').hide();
    
    // Título del modal según el estado del pedido
    if (currentStatus === 'Pendiente') {
      $('#change-status-modal-title').text('Editar Pedido Pendiente');
    } else {
      $('#change-status-modal-title').text('Información del Pedido');
    }
    
    // Solo mostrar el campo de dirección si el pedido está pendiente
    if (currentStatus === 'Pendiente') {
      $('#address-update-container').removeClass('d-none');
      
      // Cargar la dirección actual del pedido
      $.ajax({
        url: `${window.API_BASE_URL}/admin/pedidos/todos?page=0&size=100`,
        type: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        success: function(data) {
          const order = data.content.find(o => o.idPedido == orderId);
          if (order) {
            $('#current-address').text(order.direccionEntrega || 'No especificada');
            $('#new-address').val(order.direccionEntrega || '');
          }
        },
        error: function(xhr) {
          $('#current-address').text('Error al cargar dirección');
        }
      });
      
      // Configurar opciones de estado (solo Cancelado para pedidos pendientes)
      const $newStatus = $('#new-status');
      $newStatus.empty();
      $newStatus.append('<option value="">No cambiar estado</option>');
      $newStatus.append('<option value="Cancelado">Cancelar pedido</option>');
      
      // Mostrar mensaje informativo
      $('#status-info').removeClass('d-none').text('Nota: Solo puede cancelar los pedidos pendientes, no se pueden cambiar a otro estado.');
      
      // Mostrar el botón de confirmación
      $('#confirm-status-change').prop('disabled', false);
    } else {
      // Para pedidos no pendientes, ocultar campos de edición y mostrar mensaje
      $('#address-update-container').addClass('d-none');
      
      // Ocultar selector de estado
      $('#status-selector-container').addClass('d-none');
      
      // Mostrar mensaje informativo
      $('#status-info').removeClass('d-none')
        .text(`Los pedidos con estado "${currentStatus}" no pueden ser modificados.`);
      
      // Deshabilitar botón de confirmación
      $('#confirm-status-change').prop('disabled', true);
    }
    
    // Mostrar el modal
    $('#change-status-modal').modal('show');
  }
  
  function changeOrderStatus(orderId, newStatus, nuevaDireccion) {
    // Verificar si hay algún cambio para realizar
    if (!newStatus && !nuevaDireccion) {
      $('#status-error').text('No ha realizado ningún cambio').show();
      return;
    }
    
    // Deshabilitar botón y mostrar spinner
    $('#confirm-status-change').prop('disabled', true).html(
      '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Actualizando...'
    );
    
    // Construir la URL con los parámetros adecuados
    let url = `${window.API_BASE_URL}/admin/pedidos/${orderId}?`;
    let parametrosAgregados = false;
    
    if (nuevaDireccion) {
      url += `nuevaDireccion=${encodeURIComponent(nuevaDireccion)}`;
      parametrosAgregados = true;
    }
    
    if (newStatus) {
      if (parametrosAgregados) url += '&';
      url += `nuevoEstado=${newStatus}`;
    }
    
    // Usar PUT en lugar de PATCH (según la documentación proporcionada)
    $.ajax({
      url: url,
      type: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      success: function(response) {
        // Cerrar modal
        $('#change-status-modal').modal('hide');
        
        // Restaurar botón
        $('#confirm-status-change').prop('disabled', false).text('Confirmar Cambios');
        
        // Mostrar mensaje de éxito
        showToast('success', 'Pedido actualizado correctamente');
        
        // Recargar la lista de pedidos para mostrar el cambio
        loadOrders();
      },
      error: function(xhr) {
        // Restaurar botón
        $('#confirm-status-change').prop('disabled', false).text('Confirmar Cambios');
        
        let errorMsg = 'Error al actualizar el pedido';
        if (xhr.responseJSON && xhr.responseJSON.mensaje) {
          errorMsg = xhr.responseJSON.mensaje;
        }
        
        $('#status-error').text(errorMsg).show();
      }
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
      const page = $(this).data('page');
      
      if (typeof page === 'number' && page >= 0 && page < totalPages) {
        currentPage = page;
        loadOrders();
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
      // Fallback a un simple alert
      alert(message);
    }
  }
});
