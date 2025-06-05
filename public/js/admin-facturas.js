$(function() {
  // Verificar autenticación de administrador
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  
  // Definir la URL base para las llamadas a la API
  const API_BASE_URL = 'https://backmotos.onrender.com/api';
  
  if (!token) {
    window.location.href = '/auth/login?redirect=/admin/facturas';
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
  let clienteFilter = ''; // Vacío significa todos
  let fechaInicioFilter = null;
  let fechaFinFilter = null;
  
  // Cargar navbar y facturas iniciales
  loadNavbar();
  loadFacturas();
  loadEstadisticas();
  
  // Event listeners
  $('#refresh-btn').on('click', function() {
    // Limpiar todos los filtros
    clienteFilter = '';
    fechaInicioFilter = null;
    fechaFinFilter = null;
    $('#cliente-search').val('');
    $('#fecha-inicio').val('');
    $('#fecha-fin').val('');
    currentPage = 0;
    
    // Recargar facturas y estadísticas
    loadFacturas();
    loadEstadisticas();
  });
  
  // Búsqueda por cédula de cliente
  $('#search-cliente-btn').on('click', function() {
    clienteFilter = $('#cliente-search').val().trim();
    fechaInicioFilter = null;
    fechaFinFilter = null;
    $('#fecha-inicio').val('');
    $('#fecha-fin').val('');
    currentPage = 0;
    loadFacturas();
  });
  
  // Búsqueda por rango de fechas
  $('#search-fecha-btn').on('click', function() {
    const fechaInicio = $('#fecha-inicio').val();
    const fechaFin = $('#fecha-fin').val();
    
    // Validar que ambas fechas estén presentes
    if (!fechaInicio || !fechaFin) {
      showToast('error', 'Debe especificar ambas fechas para filtrar');
      return;
    }
    
    clienteFilter = '';
    $('#cliente-search').val('');
    fechaInicioFilter = fechaInicio;
    fechaFinFilter = fechaFin;
    currentPage = 0;
    loadFacturas();
    
    // También actualizar estadísticas con el mismo rango de fechas
    loadEstadisticas(fechaInicio, fechaFin);
  });
  
  // Event delegation para el botón "Ver detalles"
  $(document).on('click', '.view-factura-details', function(e) {
    e.preventDefault();
    const facturaId = $(this).data('id');
    loadFacturaDetails(facturaId);
  });
  
  // Event delegation para el botón "Anular factura"
  $(document).on('click', '.anular-factura-btn', function(e) {
    e.preventDefault();
    const facturaId = $(this).data('id');
    // Verificar que la factura no esté ya anulada
    const isAnulada = $(this).data('anulada') === true;
    
    if (isAnulada) {
      showToast('error', 'Esta factura ya ha sido anulada');
      return;
    }
    
    showAnularFacturaModal(facturaId);
  });
  
  // Botón para confirmar anulación de factura
  $('#confirm-anular-btn').on('click', function() {
    const facturaId = $('#factura-id-anular').val();
    const motivo = $('#motivo-anulacion').val().trim();
    
    if (!motivo) {
      $('#anular-error').text('Por favor ingrese un motivo para la anulación').show();
      return;
    }
    
    anularFactura(facturaId, motivo);
  });
  
  // Botón para imprimir factura
  $('#print-factura-btn').on('click', function() {
    printFactura();
  });
  
  // Funciones
  function loadNavbar() {
    $('#navbar-container').load('/partials/navbar-admin');
  }
  
  function loadFacturas() {
    $('#loading-facturas').show();
    $('#facturas-table-container').hide();
    $('#no-facturas-message').hide();
    
    // Construir URL según el filtro
    let url;
    
    if (clienteFilter) {
      // Filtrar por cliente
      url = `${API_BASE_URL}/admin/facturas/cliente/${clienteFilter}?page=${currentPage}&size=${pageSize}&sort=fechaEmision&direction=DESC`;
    } else if (fechaInicioFilter && fechaFinFilter) {
      // Filtrar por rango de fechas - Corregido para usar el endpoint adecuado y formato correcto
      url = `${API_BASE_URL}/admin/facturas/fecha?fechaInicio=${fechaInicioFilter}&fechaFin=${fechaFinFilter}&page=${currentPage}&size=${pageSize}`;
    } else {
      // Cargar todas las facturas
      url = `${API_BASE_URL}/admin/facturas/todas?page=${currentPage}&size=${pageSize}&sort=fechaEmision&direction=DESC`;
    }
    
    console.log('Cargando facturas desde URL:', url);
    
    $.ajax({
      url: url,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        $('#loading-facturas').hide();
        
        if (data && data.content && data.content.length > 0) {
          renderFacturas(data.content);
          renderPagination(data);
          $('#facturas-table-container').show();
        } else {
          $('#no-facturas-message').show();
        }
      },
      error: function(xhr) {
        $('#loading-facturas').hide();
        
        if (xhr.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          window.location.href = '/auth/login?redirect=/admin/facturas';
        } else {
          showToast('error', 'Error al cargar las facturas: ' + (xhr.responseJSON?.mensaje || xhr.statusText));
          $('#no-facturas-message').show();
        }
      }
    });
  }
  
  function renderFacturas(facturas) {
    const $tbody = $('#facturas-table-body');
    $tbody.empty();
    
    console.log('Facturas recibidas:', facturas); // Depuración para ver estructura completa
    
    facturas.forEach(factura => {
      // Formatear fecha
      const fecha = new Date(factura.fechaEmision);
      const fechaFormateada = fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Estado de la factura - implementación más robusta
      // Manejar diferentes formatos posibles del campo estado
      console.log(`Factura ID ${factura.id} - Estado:`, factura.estado);
      
      // Verificar el campo de estado (puede ser null, ANULADA, o venir en factura.motivoAnulacion)
      const isAnulada = factura.estado === 'ANULADA' || (factura.motivoAnulacion !== null && factura.motivoAnulacion !== undefined);
      let estadoClass = isAnulada ? 'bg-danger' : 'bg-success';
      let estadoText = isAnulada ? 'Anulada' : 'Válida';
      
      $tbody.append(`
        <tr>
          <td>${factura.id}</td>
          <td>${fechaFormateada}</td>
          <td>${factura.cedulaCliente}</td>
          <td>${factura.metodoPago || 'No especificado'}</td>
          <td>
            <span class="badge ${estadoClass}">
              ${estadoText}
            </span>
          </td>
          <td>$${formatPrice(factura.total)}</td>
          <td>
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-outline-info view-factura-details" data-id="${factura.id}">
                <i class="bi bi-eye"></i> Ver
              </button>
              ${!isAnulada ? `
                <button class="btn btn-outline-danger anular-factura-btn" data-id="${factura.id}" data-anulada="${isAnulada}">
                  <i class="bi bi-x-circle"></i> Anular
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `);
    });
  }
  
  function loadFacturaDetails(facturaId) {
    // Mostrar modal y spinner de carga
    $('#factura-detail-modal').modal('show');
    $('#factura-detail-loading').show();
    $('#factura-detail-content').hide();
    
    // Cargar detalles de la factura
    $.ajax({
      url: `${API_BASE_URL}/admin/facturas/${facturaId}`,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        $('#factura-detail-loading').hide();
        renderFacturaDetailContent(data);
        $('#factura-detail-content').show();
      },
      error: function(xhr) {
        $('#factura-detail-loading').hide();
        
        let errorMsg = 'Error al cargar los detalles de la factura';
        if (xhr.responseJSON && xhr.responseJSON.error) {
          errorMsg = xhr.responseJSON.error;
        }
        
        $('#factura-detail-content').html(`
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            ${errorMsg}
          </div>
        `).show();
      }
    });
  }
  
  function renderFacturaDetailContent(factura) {
    // Formatear fecha
    const fecha = new Date(factura.fechaEmision);
    const fechaFormateada = fecha.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    console.log('Detalle de factura completo:', factura); // Depuración
    
    // Estado de la factura - implementación más robusta
    const isAnulada = factura.estado === 'ANULADA' || (factura.motivoAnulacion !== null && factura.motivoAnulacion !== undefined);
    let estadoClass = isAnulada ? 'bg-danger' : 'bg-success';
    let estadoText = isAnulada ? 'Anulada' : 'Válida';
    
    // Construir HTML para los detalles de la factura
    let detallesHTML = '';
    if (factura.detallesFactura && factura.detallesFactura.length > 0) {
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
      
      factura.detallesFactura.forEach(detalle => {
        const subtotal = detalle.subtotal || (detalle.cantidad * detalle.precioUnitario);
        detallesHTML += `
          <tr>
            <td>${detalle.producto?.prodNombre || 'Producto'}</td>
            <td>${detalle.producto?.prodDescripcion || '-'}</td>
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
                <th class="text-end">$${formatPrice(factura.total)}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    } else {
      detallesHTML = `<div class="alert alert-info mt-3">No hay detalles disponibles para esta factura.</div>`;
    }
    
    // Mostrar toda la información de la factura
    let facturaHTML = `
      <div id="factura-printable">
        <div class="d-flex justify-content-between align-items-start mb-4">
          <div>
            <h4>FACTURA</h4>
            <p class="mb-1"><strong>Nº:</strong> ${factura.id}</p>
            <p class="mb-1"><strong>Fecha:</strong> ${fechaFormateada}</p>
            <p class="mb-1"><strong>Pedido #:</strong> ${factura.idPedido}</p>
            <p class="mb-1"><strong>Estado:</strong> <span class="badge ${estadoClass}">${estadoText}</span></p>
            ${isAnulada ? `<p class="mb-1 text-danger"><strong>Motivo anulación:</strong> ${factura.motivoAnulacion || 'No especificado'}</p>` : ''}
          </div>
          <div class="text-end">
            <h5>Motoshiba</h5>
            <p class="mb-1">RUC: 1722649860</p>
            <p class="mb-1">Dirección: Av. Principal 123</p>
            <p class="mb-1">Quito, Ecuador</p>
          </div>
        </div>
        
        <div class="card mb-4">
          <div class="card-header bg-light">
            <h5 class="mb-0">Datos del Cliente</h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <p class="mb-1"><strong>Nombre:</strong> ${factura.nombreCliente || 'No especificado'}</p>
                <p class="mb-1"><strong>Cédula/RUC:</strong> ${factura.cedulaCliente}</p>
              </div>
              <div class="col-md-6">
                <p class="mb-1"><strong>Dirección:</strong> ${factura.direccionEntrega || 'No especificada'}</p>
              </div>
            </div>
          </div>
        </div>
        
        ${detallesHTML}
        
        <div class="row mt-4">
          <div class="col-md-8">
            <div class="card border">
              <div class="card-body">
                <h6>Notas:</h6>
                <p class="mb-0">Esta factura es un comprobante válido para efectos legales y tributarios.</p>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="text-center mt-2">
              <img src="https://img.freepik.com/vector-premium/firma-ficticia-manuscrita-documentos-ilustracion-vectorial-aislada_987451-291.jpg" 
                   alt="Firma Autorizada" 
                   class="img-fluid signature-image" 
                   style="max-height: 80px; max-width: 200px;"
                   onerror="this.onerror=null; this.src='/img/no-image.png';">
              <p class="mt-1">Firma Autorizada</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    $('#factura-detail-content').html(facturaHTML);
    $('#facturaDetailModalLabel').text(`Factura #${factura.id}`);
  }
  
  function showAnularFacturaModal(facturaId) {
    $('#factura-id-anular').val(facturaId);
    $('#motivo-anulacion').val('');
    $('#anular-error').hide();
    $('#anular-factura-modal').modal('show');
  }
  
  function anularFactura(facturaId, motivo) {
    // Deshabilitar botón y mostrar indicador de carga
    $('#confirm-anular-btn').prop('disabled', true).html(
      '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Procesando...'
    );
    
    // PUT en lugar de PATCH según la documentación
    $.ajax({
      url: `${API_BASE_URL}/admin/facturas/${facturaId}/anular?motivo=${encodeURIComponent(motivo)}`,
      type: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        // Cerrar modal
        $('#anular-factura-modal').modal('hide');
        
        // Restaurar botón
        $('#confirm-anular-btn').prop('disabled', false).text('Confirmar Anulación');
        
        // Mostrar mensaje de éxito
        showToast('success', data.mensaje || 'Factura anulada correctamente');
        
        // Recargar facturas y estadísticas
        loadFacturas();
        loadEstadisticas();
      },
      error: function(xhr) {
        // Restaurar botón
        $('#confirm-anular-btn').prop('disabled', false).text('Confirmar Anulación');
        
        let errorMsg = 'Error al anular la factura';
        if (xhr.responseJSON && xhr.responseJSON.error) {
          errorMsg = xhr.responseJSON.error;
        }
        
        $('#anular-error').text(errorMsg).show();
      }
    });
  }
  
  function loadEstadisticas(fechaInicio, fechaFin) {
    $('#loading-stats').show();
    $('#stats-container').hide();
    
    // Construir URL
    let url = `${API_BASE_URL}/admin/facturas/estadisticas`;
    if (fechaInicio && fechaFin) {
      url += `?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    }
    
    $.ajax({
      url: url,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        $('#loading-stats').hide();
        
        // Actualizar las estadísticas
        $('#total-facturas').text(data.totalFacturas || 0);
        $('#facturas-anuladas').text(data.facturasAnuladas || 0);
        $('#total-facturado').text('$' + formatPrice(data.montoTotal || 0));
        $('#promedio-factura').text('$' + formatPrice(data.promedioFactura || 0));
        
        $('#stats-container').show();
      },
      error: function(xhr) {
        $('#loading-stats').hide();
        showToast('error', 'Error al cargar estadísticas');
      }
    });
  }
  
  function printFactura() {
    const printContent = document.getElementById('factura-printable').innerHTML;
    const originalContent = document.body.innerHTML;
    
    // Estilos para la impresión
    const printStyles = `
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h4, h5, h6 { margin-bottom: 10px; }
        p { margin-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        th { background-color: #f2f2f2; }
        .text-end { text-align: right; }
        .text-center { text-align: center; }
        .mb-4 { margin-bottom: 20px; }
        .row { display: flex; margin-bottom: 20px; }
        .col-md-6, .col-md-8 { flex: 1; }
        .col-md-4 { width: 33%; }
        .badge { padding: 5px 10px; border-radius: 4px; }
        .bg-success { background-color: #28a745; color: white; }
        .bg-danger { background-color: #dc3545; color: white; }
        @media print {
          .modal-footer, .btn, button { display: none !important; }
        }
      </style>
    `;
    
    // Cambiar contenido, imprimir y restaurar
    document.body.innerHTML = printStyles + printContent;
    window.print();
    document.body.innerHTML = originalContent;
    
    // Recargar la página después de imprimir para restaurar todo correctamente
    location.reload();
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
        loadFacturas();
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
