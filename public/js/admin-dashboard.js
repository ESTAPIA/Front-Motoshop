$(function() {
  // Verificar autenticación
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/auth/login?redirect=/admin/dashboard';
    return;
  }
  
  const role = localStorage.getItem('role');
  if (role !== 'ROLE_ADMIN') {
    window.location.href = '/';
    return;
  }
  
  // Cargar navbar de administrador
  loadNavbar();
  
  // Cargar datos del dashboard
  loadDashboardData();
  
  // Cargar pedidos recientes
  loadRecentOrders();
  
  // Cargar usuarios recientes
  loadRecentUsers();
  
  // Cargar datos de stock crítico
  loadCriticalStock();
  
  // Cargar datos de tendencias para gráficos
  loadTrendsData();
  
  // Funciones
  function loadNavbar() {
    $('#navbar-container').load('/partials/navbar-admin');
  }
  
  function loadDashboardData() {
    // Cargar estadísticas básicas usando la nueva ruta
    $.ajax({
      url: `${window.API_BASE_URL}/admin/dashboard/stats`,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        // Actualizar contadores con los nuevos nombres de campos
        $('#users-count').text(data.totalUsuarios || 0);
        $('#products-count').text(data.totalProductos || 0);
        $('#orders-count').text(data.totalPedidos || 0);
        $('#invoices-count').text(data.totalFacturas || 0);
        
        // Si hay un contenedor para estadísticas de pedidos por estado, actualizarlo
        if (data.pedidosPorEstado && $('#orders-by-status').length) {
          $('#pending-orders').text(data.pedidosPorEstado.pendientes || 0);
          $('#confirmed-orders').text(data.pedidosPorEstado.confirmados || 0);
          $('#canceled-orders').text(data.pedidosPorEstado.cancelados || 0);
        }
        
        // Si hay un contenedor para estadísticas de facturas, actualizarlo
        if (data.facturas && $('#invoices-stats').length) {
          $('#active-invoices').text(data.facturas.activas || 0);
          $('#canceled-invoices').text(data.facturas.anuladas || 0);
        }
      },
      error: function(xhr) {
        if (xhr.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          window.location.href = '/auth/login?redirect=/admin/dashboard';
        } else {
          console.error('Error al cargar estadísticas:', xhr.responseJSON?.mensaje || xhr.statusText);
          showToast('error', 'Error al cargar estadísticas del dashboard');
        }
      }
    });
  }
  
  function loadRecentOrders() {
    // Usar el nuevo endpoint para pedidos recientes
    $.ajax({
      url: `${window.API_BASE_URL}/admin/dashboard/pedidos-recientes?limit=5`,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        $('#loading-recent-orders').hide();
        
        if (data && data.length > 0) {
          renderRecentOrders(data);
          $('#recent-orders').show();
        } else {
          $('#no-recent-orders').show();
        }
      },
      error: function(xhr) {
        $('#loading-recent-orders').hide();
        $('#no-recent-orders').show();
        console.error('Error al cargar pedidos recientes:', xhr.responseJSON?.mensaje || xhr.statusText);
      }
    });
  }
  
  function loadRecentUsers() {
    // Usar el nuevo endpoint para usuarios recientes
    $.ajax({
      url: `${window.API_BASE_URL}/admin/dashboard/usuarios-recientes?limit=5`,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        $('#loading-recent-users').hide();
        
        if (data && data.length > 0) {
          renderRecentUsers(data);
          $('#recent-users').show();
        } else {
          $('#no-recent-users').show();
        }
      },
      error: function(xhr) {
        $('#loading-recent-users').hide();
        $('#no-recent-users').show();
        console.error('Error al cargar usuarios recientes:', xhr.responseJSON?.mensaje || xhr.statusText);
      }
    });
  }
  
  function loadCriticalStock() {
    // Solo cargar si existe el contenedor para productos con stock crítico
    if ($('#critical-stock').length) {
      $.ajax({
        url: `${window.API_BASE_URL}/admin/dashboard/stock-critico`,
        type: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        success: function(data) {
          $('#loading-critical-stock').hide();
          
          if (data && data.productos && data.productos.length > 0) {
            // Actualizar contador
            $('#critical-stock-count').text(data.cantidad || 0);
            
            // Renderizar productos con stock crítico
            renderCriticalStock(data.productos);
            $('#critical-stock-list').show();
          } else {
            $('#no-critical-stock').show();
          }
        },
        error: function(xhr) {
          $('#loading-critical-stock').hide();
          $('#no-critical-stock').show();
          console.error('Error al cargar stock crítico:', xhr.responseJSON?.mensaje || xhr.statusText);
        }
      });
    }
  }
  
  function loadTrendsData() {
    // Solo cargar si existe algún contenedor para gráficos
    if ($('#sales-chart').length || $('#categories-chart').length) {
      $.ajax({
        url: `${window.API_BASE_URL}/admin/dashboard/tendencias`,
        type: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        success: function(data) {
          // Si hay datos de ventas por mes y existe el contenedor, renderizar el gráfico
          if (data.ventasPorMes && $('#sales-chart').length) {
            renderSalesChart(data.ventasPorMes);
          }
        },
        error: function(xhr) {
          console.error('Error al cargar tendencias:', xhr.responseJSON?.mensaje || xhr.statusText);
        }
      });
    }
  }
  
  function renderRecentOrders(orders) {
    const $container = $('#recent-orders-list');
    $container.empty();
    
    orders.forEach(order => {
      // Determinar color según estado
      let badgeClass = '';
      switch (order.estado) {
        case 'Pendiente': badgeClass = 'bg-warning text-dark'; break;
        case 'Confirmado': badgeClass = 'bg-success'; break;
        case 'Enviado': badgeClass = 'bg-info'; break;
        case 'Entregado': badgeClass = 'bg-primary'; break;
        case 'Cancelado': badgeClass = 'bg-danger'; break;
        default: badgeClass = 'bg-secondary';
      }
      
      // Formatear fecha
      const fecha = new Date(order.fecha);
      const fechaFormateada = fecha.toLocaleDateString('es-ES');
      
      $container.append(`
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <strong>Pedido #${order.idPedido}</strong> - ${order.cedulaCliente || order.cliCedula}
            <span class="badge ${badgeClass} ms-2">${order.estado}</span>
            <br>
            <small class="text-muted">${fechaFormateada}</small>
          </div>
          <span class="badge bg-primary rounded-pill">$${formatPrice(order.total)}</span>
        </li>
      `);
    });
  }
  
  function renderRecentUsers(users) {
    const $container = $('#recent-users-list');
    $container.empty();
    
    users.forEach(user => {
      const nombreCompleto = [user.nombre, user.apellido].filter(Boolean).join(' ') || 'Usuario';
      
      $container.append(`
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <strong>${nombreCompleto}</strong>
            <br>
            <small class="text-muted">${user.cedula}</small>
          </div>
          <small class="text-muted">${formatDate(user.fechaRegistro)}</small>
        </li>
      `);
    });
  }
  
  function renderCriticalStock(products) {
    const $container = $('#critical-stock-list');
    $container.empty();
    
    products.forEach(product => {
      $container.append(`
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <strong>${product.nombre}</strong>
            <span class="badge bg-danger ms-2">Stock: ${product.stock}</span>
          </div>
          <a href="/admin/products" class="btn btn-sm btn-outline-primary">Gestionar</a>
        </li>
      `);
    });
  }
  
  function renderSalesChart(salesData) {
    // Esta función requiere Chart.js para funcionar
    if (typeof Chart === 'undefined') {
      console.error('Chart.js no está disponible. No se puede renderizar el gráfico de ventas.');
      return;
    }
    
    const ctx = document.getElementById('sales-chart').getContext('2d');
    
    // Extraer meses y valores
    const labels = salesData.map(item => item.mes);
    const data = salesData.map(item => item.valor);
    
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Ventas Mensuales',
          data: data,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Tendencia de Ventas'
          }
        }
      }
    });
  }
  
  function formatPrice(price) {
    if (!price) return '0.00';
    return parseFloat(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }
  
  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
  }
  
  function showToast(type, message) {
    // Usar la función global de toast si está disponible
    if (typeof window.showGlobalToast === 'function') {
      window.showGlobalToast(type, message);
    } else {
      // Fallback a un simple console.log
      console.log(`[${type}] ${message}`);
    }
  }
});
