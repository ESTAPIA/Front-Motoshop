$(function() {
  // Eliminar el bloque main.flex-grow-1 y su contenido del DOM
  const mainElement = $('main.flex-grow-1');
  if (mainElement.length) {
    // Mover cualquier contenido útil que pudiera estar dentro
    mainElement.contents().unwrap();
    // Eliminar el div.content también
    $('div.content').contents().unwrap();
  }

  // Verificar autenticación de administrador
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  
  if (!token) {
    window.location.href = '/auth/login?redirect=/admin/stats/stock-critico';
    return;
  }
  
  if (role !== 'ROLE_ADMIN') {
    window.location.href = '/';
    return;
  }
  
  // Cargar navbar y productos
  loadNavbar();
  loadProductsWithCriticalStock();
  
  // Inicializar efectos de partículas (misma animación que orders)
  initBackgroundEffects();
  
  // Event listeners
  $('#refresh-btn').on('click', loadProductsWithCriticalStock);
  
  // Funciones
  function loadNavbar() {
    $('#navbar-container').load('/partials/navbar-admin');
  }
  
  // Inicializar efectos de fondo
  function initBackgroundEffects() {
    // Crear partículas (puntos flotantes)
    const particles = document.querySelector('.particles');
    if (particles) {
      for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        // Posición aleatoria
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        
        // Tamaño aleatorio
        const size = Math.random() * 5 + 1;
        
        // Estilo de la partícula
        particle.style.cssText = `
          position: absolute;
          top: ${posY}%;
          left: ${posX}%;
          width: ${size}px;
          height: ${size}px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 50%;
          animation: float ${Math.random() * 10 + 10}s linear infinite;
        `;
        
        particles.appendChild(particle);
      }
    }
    
    // Efecto de relámpagos (opcional)
    const lightning = document.querySelector('.lightning-effect');
    if (lightning) {
      setInterval(() => {
        if (Math.random() > 0.97) {
          lightning.style.opacity = Math.random() * 0.2;
          setTimeout(() => {
            lightning.style.opacity = 0;
          }, 200);
        }
      }, 500);
    }
  }
  
  function loadProductsWithCriticalStock() {
    $('#loading-products').show();
    $('#products-container').hide();
    $('#no-products-message').hide();
    
    $.ajax({
      url: `${window.API_BASE_URL || 'https://backmotos.onrender.com/api'}/estadisticas/productos/stock-critico`,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        $('#loading-products').hide();
        
        if (data && data.length > 0) {
          renderProducts(data);
          $('#products-container').show();
        } else {
          $('#no-products-message').show();
        }
      },
      error: function(xhr) {
        $('#loading-products').hide();
        
        if (xhr.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          window.location.href = '/auth/login?redirect=/admin/stats/stock-critico';
        } else {
          showToast('error', 'Error al cargar los productos: ' + (xhr.responseJSON?.mensaje || xhr.statusText));
          $('#no-products-message').show();
        }
      }
    });
  }
  
  function renderProducts(products) {
    const $container = $('#products-container');
    $container.empty();
    
    products.forEach(product => {
      // Determinar el color según el porcentaje de stock
      let stockColor = 'danger';
      if (product.porcentajeStock > 15) {
        stockColor = 'warning';
      } else if (product.porcentajeStock > 5) {
        stockColor = 'danger';
      }
      
      // Obtener la imagen principal o la primera disponible
      let imageUrl = product.imagenPrincipal || 
                    (product.imagenes && product.imagenes.length > 0 ? 
                     product.imagenes[0] : '/img/no-image.png');
      
      $container.append(`
        <div class="col-md-4 col-lg-3">
          <div class="card h-100 border-${stockColor}">
            <div class="position-relative">
              <img src="${imageUrl}" class="card-img-top" alt="${product.nombre}" 
                   style="height: 200px; object-fit: contain;" 
                   onerror="this.onerror=null; this.src='/img/no-image.png';">
              <div class="position-absolute top-0 end-0 m-2">
                <span class="badge bg-${stockColor}">
                  Stock: ${product.stock}
                </span>
              </div>
            </div>
            <div class="card-body">
              <h5 class="card-title">${product.nombre}</h5>
              <p class="card-text small">${truncateText(product.descripcion, 100)}</p>
              <div class="d-flex justify-content-between align-items-center">
                <span class="fw-bold">$${formatPrice(product.precio)}</span>
                <span class="badge bg-secondary">${product.categoria}</span>
              </div>
            </div>
            <div class="card-footer bg-transparent border-${stockColor}">
              <div class="progress">
                <div class="progress-bar bg-${stockColor}" role="progressbar" 
                     style="width: ${product.porcentajeStock}%" 
                     aria-valuenow="${product.porcentajeStock}" 
                     aria-valuemin="0" aria-valuemax="100">
                  ${product.porcentajeStock}%
                </div>
              </div>
              <small class="text-muted mt-2 d-block">Nivel de stock: ${product.porcentajeStock}%</small>
            </div>
          </div>
        </div>
      `);
    });
  }
  
  function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
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
});
