// Lógica para la sección de Facturas (frontend/public/js/facturas.js)

$(function() {
  // Verificar autenticación
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/auth/login?redirect=/facturas';
    return;
  }
  
  // Cargar la navbar adecuada
  loadNavbar();
  
  // Variables para paginación
  let currentPage = 0;
  let pageSize = 10;
  let totalPages = 0;
  
  // Cargar facturas iniciales
  loadFacturas();
  
  // Aplicar cambio de color azul a verde
  applyGreenColorScheme();
  
  // Funciones
  function loadNavbar() {
    const role = localStorage.getItem('role');
    const partial = role === 'ROLE_ADMIN' ? 'navbar-admin' : 'navbar-user';
    $('#navbar-container').load(`/partials/${partial}`);
  }
  
  function loadFacturas() {
    $('#loading-facturas').show();
    $('#facturas-container').hide();
    $('#no-facturas-message').hide();
    
    $.ajax({
      url: `${window.API_BASE_URL}/facturas/mis-facturas?page=${currentPage}&size=${pageSize}`,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        $('#loading-facturas').hide();
        
        if (data && data.content && data.content.length > 0) {
          renderFacturas(data.content);
          renderPagination(data);
          $('#facturas-container').show();
          
          // Aplicar el esquema de color verde después de renderizar
          applyGreenColorScheme();
        } else {
          $('#no-facturas-message').show();
        }
      },
      error: function(xhr) {
        $('#loading-facturas').hide();
        
        if (xhr.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          window.location.href = '/auth/login?redirect=/facturas';
        } else {
          showToast('error', 'Error al cargar las facturas: ' + (xhr.responseJSON?.error || xhr.statusText));
          $('#no-facturas-message').show();
        }
      }
    });
  }
  
  function renderFacturas(facturas) {
    const $container = $('#facturas-container');
    $container.empty();
    $container.removeClass('d-none');
    
    let html = '<div class="row">';
    
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
      
      // Cambiamos "bg-primary" por "bg-success" para aplicar el esquema verde
      html += `
        <div class="col-md-6 mb-4">
          <div class="card h-100">
            <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Factura #${factura.id}</h5>
              <span class="badge bg-light text-dark">Pedido #${factura.idPedido}</span>
            </div>
            <div class="card-body">
              <div class="mb-3">
                <p><strong>Cliente:</strong> ${factura.nombreCliente}</p>
                <p><strong>Cédula:</strong> ${factura.cedulaCliente}</p>
                <p><strong>Dirección:</strong> ${factura.direccionEntrega || 'No especificada'}</p>
                <p><strong>Fecha de emisión:</strong> ${fechaFormateada}</p>
                <p class="text-end mb-0"><strong class="fs-5">Total: $${formatPrice(factura.total)}</strong></p>
              </div>
            </div>
            <div class="card-footer d-flex justify-content-end gap-2">
              <button class="btn btn-outline-success btn-sm view-invoice-btn" data-invoice-id="${factura.id}">
                <i class="bi bi-receipt me-1"></i>Ver Factura
              </button>
              <button class="btn btn-outline-secondary btn-sm view-order-btn" data-order-id="${factura.idPedido}">
                <i class="bi bi-box-seam me-1"></i>Ver Pedido
              </button>
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    $container.html(html);
    
    // Agregar listeners para los botones
    $('.view-order-btn').on('click', function() {
      const orderId = $(this).data('order-id');
      loadOrderDetails(orderId);
    });
    
    $('.view-invoice-btn').on('click', function() {
      const invoiceId = $(this).data('invoice-id');
      loadInvoiceDetails(invoiceId);
    });
  }
  
  // Función para cargar los detalles de la factura
  function loadInvoiceDetails(invoiceId) {
    // Mostrar modal con spinner de carga
    showInvoiceModal(true);
    
    // Cargar los detalles de la factura
    $.ajax({
      url: `${window.API_BASE_URL}/facturas/detalle/${invoiceId}`,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(invoiceDetails) {
        // Actualizar contenido del modal con los detalles de la factura
        updateInvoiceModalContent(invoiceDetails);
        // Aplicar esquema de color verde después de cargar el modal
        applyGreenColorScheme();
      },
      error: function(xhr) {
        // Cerrar el modal y mostrar mensaje de error
        $('#invoice-detail-modal').modal('hide');
        showToast('error', 'Error al cargar los detalles de la factura: ' + (xhr.responseJSON?.mensaje || xhr.statusText));
      }
    });
  }
  
  // Función para mostrar el modal inicial de factura con spinner o finalizar la carga
  function showInvoiceModal(isLoading = false) {
    // Si el modal ya existe, removerlo para evitar duplicados
    $('#invoice-detail-modal').remove();
    
    // Crear el modal (cambiando bg-primary por bg-success)
    const modalHtml = `
      <div class="modal fade" id="invoice-detail-modal" tabindex="-1" aria-labelledby="invoiceDetailModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-success text-white">
              <h5 class="modal-title" id="invoiceDetailModalLabel">Detalles de la Factura</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              ${isLoading ? `
                <div class="text-center py-5" id="invoice-loading">
                  <div class="spinner-border text-success" role="status">
                    <span class="visually-hidden">Cargando...</span>
                  </div>
                  <p class="mt-3">Cargando detalles de la factura...</p>
                </div>
              ` : ''}
              <div id="invoice-content" class="${isLoading ? 'd-none' : ''}"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
              <button type="button" class="btn btn-success" id="print-invoice-btn">
                <i class="bi bi-printer me-1"></i>Imprimir
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Agregar el modal al DOM
    $('body').append(modalHtml);
    
    // Mostrar el modal
    const invoiceModal = new bootstrap.Modal(document.getElementById('invoice-detail-modal'));
    invoiceModal.show();
    
    // Agregar event listener para el botón de imprimir
    $('#print-invoice-btn').on('click', function() {
      printInvoice();
    });
  }
  
  // Función para actualizar el contenido del modal con los detalles de la factura
  function updateInvoiceModalContent(invoice) {
    // Formatear fechas
    const fechaEmision = new Date(invoice.fechaEmision);
    const fechaEmisionFormateada = fechaEmision.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Usar let en lugar de const para permitir modificaciones
    let subTotal = 0;
    
    // Construir el HTML de la factura en formato de documento
    const invoiceHtml = `
      <div id="invoice-printable">
        <div class="d-flex justify-content-between align-items-start mb-4">
          <div>
            <h4>FACTURA</h4>
            <p class="mb-1"><strong>Nº:</strong> ${invoice.id}</p>
            <p class="mb-1"><strong>Fecha:</strong> ${fechaEmisionFormateada}</p>
            <p class="mb-1"><strong>ID Empresa:</strong> ${invoice.idEmpresa}</p>
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
                <p class="mb-1"><strong>Nombre:</strong> ${invoice.nombreCliente}</p>
                <p class="mb-1"><strong>Cédula/RUC:</strong> ${invoice.cedulaCliente}</p>
              </div>
              <div class="col-md-6">
                <p class="mb-1"><strong>Dirección:</strong> ${invoice.direccionEntrega || 'No especificada'}</p>
                <p class="mb-1"><strong>Método de pago:</strong> ${invoice.metodoPago || 'No especificado'}</p>
              </div>
            </div>
          </div>
        </div>
        
        <h5>Detalles de la Factura</h5>
        <div class="table-responsive mb-4">
          <table class="table table-striped border">
            <thead class="table-light">
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th class="text-center">Cantidad</th>
                <th class="text-end">Precio Unit.</th>
                <th class="text-end">Total</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    // Declarar variable para contenedor del HTML de los productos
    let productosHtml = '';
    
    // Agregar filas de productos
    if (invoice.detallesFactura && invoice.detallesFactura.length > 0) {
      invoice.detallesFactura.forEach(item => {
        // Usar variables let para permitir operaciones
        let precioUnitario = parseFloat(item.precioUnitario) || 0;
        let cantidad = parseInt(item.cantidad) || 0;
        let total = precioUnitario * cantidad;
        
        productosHtml += `
          <tr>
            <td>${item.producto.idProducto}</td>
            <td>${item.producto.prodNombre}</td>
            <td class="text-center">${cantidad}</td>
            <td class="text-end">$${formatPrice(precioUnitario)}</td>
            <td class="text-end">$${formatPrice(total)}</td>
          </tr>
        `;
      });
    } else {
      productosHtml = `
        <tr>
          <td colspan="5" class="text-center">No hay productos en esta factura</td>
        </tr>
      `;
    }
    
    // Combinar todo el HTML - Mostrar directamente el total sin subtotal ni IVA
    const facturaCompleta = invoiceHtml + productosHtml + `
            </tbody>
            <tfoot class="table-light">
              <tr>
                <td colspan="4" class="text-end"><strong>Total:</strong></td>
                <td class="text-end"><strong>$${formatPrice(invoice.total)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
        
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
                   style="max-height: 80px; max-width: 200px;">
              <p class="mt-1">Firma Autorizada</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Actualizar el contenido del modal y ocultar el spinner
    $('#invoice-loading').hide();
    $('#invoice-content').html(facturaCompleta).removeClass('d-none');
    $('#invoiceDetailModalLabel').text(`Factura #${invoice.id}`);
  }
  
  // Función para imprimir la factura
  function printInvoice() {
    const printContent = document.getElementById('invoice-printable').innerHTML;
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
  
  // Nueva función para cargar los detalles del pedido
  function loadOrderDetails(orderId) {
    // Mostrar modal con spinner de carga
    showOrderModal(true);
    
    // Cargar los detalles del pedido
    $.ajax({
      url: `${window.API_BASE_URL}/pedidos/${orderId}`,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(orderDetails) {
        // Actualizar contenido del modal con los detalles del pedido
        updateOrderModalContent(orderDetails);
        // Aplicar esquema de color verde después de cargar el modal
        applyGreenColorScheme();
      },
      error: function(xhr) {
        // Cerrar el modal y mostrar mensaje de error
        $('#order-detail-modal').modal('hide');
        showToast('error', 'Error al cargar los detalles del pedido: ' + (xhr.responseJSON?.mensaje || xhr.statusText));
      }
    });
  }
  
  // Función para mostrar el modal inicial con spinner o finalizar la carga
  function showOrderModal(isLoading = false) {
    // Si el modal ya existe, removerlo para evitar duplicados
    $('#order-detail-modal').remove();
    
    // Crear el modal (cambiando bg-primary por bg-success)
    const modalHtml = `
      <div class="modal fade" id="order-detail-modal" tabindex="-1" aria-labelledby="orderDetailModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-success text-white">
              <h5 class="modal-title" id="orderDetailModalLabel">Detalles del Pedido</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              ${isLoading ? `
                <div class="text-center py-5" id="order-loading">
                  <div class="spinner-border text-success" role="status">
                    <span class="visually-hidden">Cargando...</span>
                  </div>
                  <p class="mt-3">Cargando detalles del pedido...</p>
                </div>
              ` : ''}
              <div id="order-content" class="${isLoading ? 'd-none' : ''}"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Agregar el modal al DOM
    $('body').append(modalHtml);
    
    // Mostrar el modal
    const orderModal = new bootstrap.Modal(document.getElementById('order-detail-modal'));
    orderModal.show();
  }
  
  // Función para actualizar el contenido del modal con los detalles del pedido
  function updateOrderModalContent(order) {
    // Formatear fecha
    const fecha = new Date(order.fecha);
    const fechaFormateada = fecha.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Construir HTML para los detalles del pedido
    let detailsHtml = '';
    if (order.detalles && order.detalles.length > 0) {
      detailsHtml = `
        <div class="table-responsive">
          <table class="table table-striped">
            <thead>
              <tr>
                <th>Producto</th>
                <th class="text-center">Cantidad</th>
                <th class="text-end">Precio Unitario</th>
                <th class="text-end">Total</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      order.detalles.forEach(item => {
        let nombreProducto = 'Producto no disponible';
        if (item.producto) {
          nombreProducto = item.producto.prodNombre;
        } else if (item.prodNombre) {
          nombreProducto = item.prodNombre;
        }
        
        let precioUnitario = parseFloat(item.precioUnitario) || 0;
        let cantidad = parseInt(item.cantidad) || 0;
        let total = precioUnitario * cantidad;
        
        detailsHtml += `
          <tr>
            <td>${nombreProducto}</td>
            <td class="text-center">${cantidad}</td>
            <td class="text-end">$${formatPrice(precioUnitario)}</td>
            <td class="text-end">$${formatPrice(total)}</td>
          </tr>
        `;
      });
      
      detailsHtml += `
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="text-end fw-bold">Total:</td>
                <td class="text-end fw-bold">$${formatPrice(order.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    } else {
      detailsHtml = '<div class="alert alert-info">No hay productos en este pedido.</div>';
    }
    
    // Construir el contenido del modal
    const orderHtml = `
      <div class="row mb-4">
        <div class="col-md-6">
          <h6>Información del Pedido</h6>
          <p><strong>Pedido #:</strong> ${order.idPedido}</p>
          <p><strong>Fecha:</strong> ${fechaFormateada}</p>
          <p><strong>Estado:</strong> <span class="badge ${getStatusBadgeClass(order.estado)}">${order.estado}</span></p>
          <p><strong>Cliente:</strong> ${order.cliCedula}</p>
        </div>
        <div class="col-md-6">
          <h6>Información de Entrega</h6>
          <p><strong>Dirección:</strong> ${order.direccionEntrega || 'No especificada'}</p>
          <p><strong>Método de Pago:</strong> ${order.metodoPago || 'No especificado'}</p>
        </div>
      </div>
      
      <h6>Productos</h6>
      ${detailsHtml}
    `;
    
    // Actualizar el contenido del modal y ocultar el spinner
    $('#order-loading').hide();
    $('#order-content').html(orderHtml).removeClass('d-none');
    $('#orderDetailModalLabel').text(`Detalles del Pedido #${order.idPedido}`);
  }
  
  // Función para obtener la clase de color para el estado del pedido
  function getStatusBadgeClass(status) {
    switch (status) {
      case 'Pendiente':
        return 'bg-warning text-dark';
      case 'Confirmado':
        return 'bg-success';
      case 'Enviado':
        return 'bg-info';
      case 'Entregado':
        return 'bg-success'; // Cambiado de bg-primary a bg-success
      case 'Cancelado':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
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
      alert(message);
    }
  }
  
  // Nueva función para cambiar los colores azules a verdes en tiempo real
  function applyGreenColorScheme() {
    // Cambiar los encabezados de tarjetas de azul a verde
    $('.card-header.bg-primary').removeClass('bg-primary').addClass('bg-success');
    
    // Cambiar los botones y badges relacionados con facturas de azul a verde
    $('.btn-primary').removeClass('btn-primary').addClass('btn-success');
    $('.btn-outline-primary').removeClass('btn-outline-primary').addClass('btn-outline-success');
    $('.badge.bg-primary').removeClass('bg-primary').addClass('bg-success');
    $('.spinner-border.text-primary').removeClass('text-primary').addClass('text-success');
    
    // Cambiar colores en modales
    $('.modal-header.bg-primary').removeClass('bg-primary').addClass('bg-success');
    
    // Cambiar estilos inline si existen
    $('[style*="background-color: #0d6efd"]').css('background-color', '#198754');
    $('[style*="color: #0d6efd"]').css('color', '#198754');
    $('[style*="border-color: #0d6efd"]').css('border-color', '#198754');
  }
});

// Ejecutar cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Crear y añadir el fondo verde animado
    const facturasBackground = document.createElement('div');
    facturasBackground.className = 'facturas-background';
    facturasBackground.innerHTML = `
        <div class="particles"></div>
        <div class="lightning-effect"></div>
    `;
    
    // Añadir el fondo al principio del contenido principal (body o main)
    const mainContent = document.querySelector('main') || document.body;
    mainContent.insertBefore(facturasBackground, mainContent.firstChild);
    
    // Añadir los estilos necesarios para el fondo animado
    const style = document.createElement('style');
    style.textContent = `
        .facturas-background {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1a2e1a 0%, #2d5a2d 50%, #0f2e0f 100%);
            z-index: -1;
            overflow: hidden;
        }
        
        .facturas-background .particles {
            position: absolute;
            width: 100%;
            height: 100%;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="10" cy="10" r="1" fill="%234CAF50" opacity="0.5"><animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/></circle><circle cx="30" cy="30" r="0.5" fill="%2381C784" opacity="0.7"><animate attributeName="opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite"/></circle><circle cx="70" cy="20" r="1.5" fill="%234CAF50" opacity="0.4"><animate attributeName="opacity" values="0.4;1;0.4" dur="3s" repeatCount="indefinite"/></circle></svg>') repeat;
            animation: float 20s infinite linear;
            opacity: 0.5;
        }
        
        .facturas-background .lightning-effect {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(ellipse at center, rgba(76, 175, 80, 0.1) 0%, transparent 70%);
            animation: pulse 4s ease-in-out infinite;
            opacity: 0.5;
        }
        
        /* Clases para textos con color crema sobre fondo verde */
        .text-cream {
            color: var(--primary-cream, #FFF8E1) !important;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            font-weight: 700;
        }
        
        .text-cream-help {
            color: var(--accent-cream, #FFFDF5) !important;
            opacity: 0.9;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
        }
        
        @keyframes float {
            from { background-position: 0 0; }
            to { background-position: 100% 100%; }
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.05); }
        }
    `;
    document.head.appendChild(style);
    
    // Actualizar los títulos para que sean visibles sobre el fondo verde
    const titles = document.querySelectorAll('h1, h2, .container > .mt-5 > h1');
    titles.forEach(title => {
        if (!title.classList.contains('text-cream')) {
            title.classList.add('text-cream');
        }
    });
    
    const subtitles = document.querySelectorAll('p.lead, .container > .mt-5 > p');
    subtitles.forEach(subtitle => {
        if (!subtitle.classList.contains('text-cream-help')) {
            subtitle.classList.add('text-cream-help');
        }
    });
});
