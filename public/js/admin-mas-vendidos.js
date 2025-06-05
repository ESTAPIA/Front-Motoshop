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
    window.location.href = '/auth/login?redirect=/admin/stats/mas-vendidos';
    return;
  }
  
  if (role !== 'ROLE_ADMIN') {
    window.location.href = '/';
    return;
  }
  
  // Variable para el límite de productos
  let limit = 10;
  
  // Cargar navbar y productos
  loadNavbar();
  loadTopSellingProducts();
  
  // Inicializar efectos de partículas (misma animación que orders)
  initBackgroundEffects();
  
  // Event listeners
  $('#refresh-btn').on('click', loadTopSellingProducts);
  
  $('#limit-select').on('change', function() {
    limit = $(this).val();
    loadTopSellingProducts();
  });
  
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
          pointer-events: none;
        `;
        
        particles.appendChild(particle);
      }
    }
    
    // Efecto de relámpagos (opcional)
    const lightning = document.querySelector('.lightning-effect');
    if (lightning) {
      lightning.style.pointerEvents = 'none';
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
  
  function loadTopSellingProducts() {
    $('#loading-products').show();
    $('#products-container').hide();
    $('#no-products-message').hide();
    
    $.ajax({
      url: `${window.API_BASE_URL || 'https://backmotos.onrender.com/api'}/estadisticas/productos/mas-vendidos?limit=${limit}`,
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
          window.location.href = '/auth/login?redirect=/admin/stats/mas-vendidos';
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
    
    products.forEach((product, index) => {
      // Determinar badge para posición (oro, plata, bronce para los 3 primeros)
      let positionBadge = '';
      if (index === 0) {
        positionBadge = '<span class="position-absolute top-0 start-0 p-2"><i class="bi bi-trophy-fill text-warning" style="font-size: 2rem;"></i></span>';
      } else if (index === 1) {
        positionBadge = '<span class="position-absolute top-0 start-0 p-2"><i class="bi bi-trophy-fill text-secondary" style="font-size: 1.8rem;"></i></span>';
      } else if (index === 2) {
        positionBadge = '<span class="position-absolute top-0 start-0 p-2"><i class="bi bi-trophy-fill text-danger" style="font-size: 1.6rem;"></i></span>';
      }
      
      // Obtener la imagen principal o la primera disponible
      let imageUrl = product.imagenPrincipal || 
                    (product.imagenes && product.imagenes.length > 0 ? 
                     product.imagenes[0] : '/img/no-image.png');
      
      $container.append(`
        <div class="col-md-4 col-lg-3">
          <div class="card h-100">
            <div class="position-relative">
              ${positionBadge}
              <img src="${imageUrl}" class="card-img-top" alt="${product.nombre}" 
                   style="height: 200px; object-fit: contain;" 
                   onerror="this.onerror=null; this.src='/img/no-image.png';">
              <div class="position-absolute top-0 end-0 m-2">
                <span class="badge bg-success">
                  #${index + 1}
                </span>
              </div>
            </div>
            <div class="card-body">
              <h5 class="card-title">${product.nombre}</h5>
              <p class="card-text small">${truncateText(product.descripcion, 100)}</p>
              <div class="d-flex justify-content-between align-items-center">
                <span class="fw-bold">$${formatPrice(product.precio)}</span>
                <span class="badge bg-primary">Stock: ${product.stock}</span>
              </div>
            </div>
            <div class="card-footer bg-transparent">
              <div class="d-flex justify-content-between align-items-center">
                <span class="text-success fw-bold">
                  <i class="bi bi-bag-check-fill"></i> ${product.cantidadVendida} vendidos
                </span>
                <span class="badge bg-info text-dark">
                  ${product.porcentajeVentas.toFixed(1)}% del total
                </span>
              </div>
              <div class="progress mt-2">
                <div class="progress-bar bg-success" role="progressbar" 
                     style="width: ${product.porcentajeVentas}%" 
                     aria-valuenow="${product.porcentajeVentas}" 
                     aria-valuemin="0" aria-valuemax="100">
                </div>
              </div>
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
