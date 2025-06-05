$(function() {
  // Obtener ID del producto de la URL
  const pathSegments = window.location.pathname.split('/');
  const productId = pathSegments[pathSegments.length - 1];
  
  // Verificar autenticación (opcional para vista de detalles)
  const token = localStorage.getItem('token');
  
  // Cargar la navbar adecuada
  const role = localStorage.getItem('role');
  const partial = token
    ? (role === 'ROLE_ADMIN' ? 'navbar-admin' : 'navbar-user')
    : 'navbar-guest';
  
  $('#navbar-container').load(`/partials/${partial}`);
  
  // Cargar detalles del producto
  loadProductDetails(productId);
  
  // Control de cantidad
  $('#decrease-quantity').on('click', function() {
    let qty = parseInt($('#product-quantity').val());
    if (qty > 1) {
      $('#product-quantity').val(qty - 1);
    }
  });
  
  $('#increase-quantity').on('click', function() {
    let qty = parseInt($('#product-quantity').val());
    let stock = parseInt($('#product-stock').data('stock'));
    if (qty < stock) {
      $('#product-quantity').val(qty + 1);
    } else {
      showToast('warning', 'Has alcanzado el máximo de stock disponible');
    }
  });
  
  // Botón añadir al carrito
  $('#add-to-cart-btn').on('click', function() {
    if (!token) {
      showToast('error', 'Debes iniciar sesión para añadir productos al carrito');
      return;
    }
    
    const quantity = parseInt($('#product-quantity').val());
    addToCart(productId, quantity);
  });
  
  // Función para cargar los detalles del producto
  function loadProductDetails(id) {
    $.ajax({
      url: window.API_BASE_URL + '/productos/' + id,
      type: 'GET',
      success: function(product) {
        renderProductDetails(product);
        $('#loading-product').hide();
        $('#product-detail').show();
      },
      error: function(xhr) {
        $('#loading-product').hide();
        $('#product-detail').html(`
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            Error al cargar los detalles del producto. Por favor, intente nuevamente.
          </div>
          <a href="/catalog" class="btn btn-primary">Volver al catálogo</a>
        `).show();
      }
    });
  }
  
  // Renderizar la información del producto
  function renderProductDetails(product) {
    // Actualizar el breadcrumb y título
    $('#product-name-breadcrumb').text(product.prodNombre || product.nombre);
    $('#product-name').text(product.prodNombre || product.nombre);
    $('#product-description').text(product.prodDescripcion || product.descripcion);
    $('#product-price').text(formatPrice(product.prodPrecio || product.precio));
    $('#product-category').text(product.categoriaNombre || 'General');
    
    const stock = product.prodStock || product.stock || 0;
    $('#product-stock')
      .text(stock)
      .addClass(stock > 5 ? 'text-success' : stock > 0 ? 'text-warning' : 'text-danger')
      .data('stock', stock);
    
    // Deshabilitar el botón si no hay stock
    if (stock <= 0) {
      $('#add-to-cart-btn').prop('disabled', true).text('Sin stock disponible');
    }
    
    // Cargar imágenes del carrusel
    const $carousel = $('#product-image-carousel');
    $carousel.empty();
    
    // Verificar si hay imágenes disponibles
    if (product.imagenesUrl && Array.isArray(product.imagenesUrl) && product.imagenesUrl.length > 0) {
      product.imagenesUrl.forEach((imageUrl, index) => {
        $carousel.append(`
          <div class="carousel-item ${index === 0 ? 'active' : ''}">
            <img src="${imageUrl}" class="d-block w-100 product-detail-image" 
                 alt="${product.prodNombre || product.nombre}" 
                 onerror="this.onerror=null; this.src='/img/no-image.png';">
          </div>
        `);
      });
    } else {
      // Si no hay imágenes, mostrar una por defecto
      $carousel.append(`
        <div class="carousel-item active">
          <img src="/img/no-image.png" class="d-block w-100 product-detail-image" 
               alt="${product.prodNombre || product.nombre}">
        </div>
      `);
    }
  }
  
  // Función para añadir al carrito
  function addToCart(productId, quantity) {
    if (quantity <= 0) {
      showToast('error', 'La cantidad debe ser mayor a cero');
      return;
    }
    
    $.ajax({
      url: window.API_BASE_URL + '/carrito/agregar',
      type: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: JSON.stringify({
        idProducto: productId,
        cantidad: quantity
      }),
      success: function(data) {
        // Mostrar mensaje de éxito
        $('#success-message').text(data.mensaje || 'Producto añadido al carrito');
        $('#add-success').slideDown();
        
        // Actualizar el contador del carrito y animar
        if (typeof updateCartCounter === 'function') {
          updateCartCounter();
          $('#cart-counter').addClass('cart-updated');
          setTimeout(() => {
            $('#cart-counter').removeClass('cart-updated');
          }, 500);
        }
        
        // Disparar evento global para que otros componentes se actualicen
        $(document).trigger('cartUpdated');
      },
      error: function(xhr) {
        let mensaje = 'Error al añadir el producto al carrito';
        
        if (xhr.status === 409) {
          mensaje = 'No hay suficiente stock disponible para la cantidad solicitada';
        } else if (xhr.responseJSON && xhr.responseJSON.mensaje) {
          mensaje = xhr.responseJSON.mensaje;
        }
        
        showToast('error', mensaje);
      }
    });
  }
  
  // Función para mostrar toast de notificaciones
  function showToast(type, message) {
    if (typeof window.showGlobalToast === 'function') {
      window.showGlobalToast(type, message);
    } else {
      const toastClass = type === 'success' ? 'bg-success' : 
                         type === 'warning' ? 'bg-warning' : 'bg-danger';
      const textClass = type === 'warning' ? 'text-dark' : 'text-white';
      const icon = type === 'success' ? 'bi-check-circle-fill' : 
                  type === 'warning' ? 'bi-exclamation-circle-fill' : 'bi-exclamation-triangle-fill';
      
      const toastHtml = `
        <div class="toast align-items-center ${toastClass} ${textClass}" role="alert" aria-live="assertive" aria-atomic="true">
          <div class="d-flex">
            <div class="toast-body">
              <i class="bi ${icon} me-2"></i> ${message}
            </div>
            <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
        </div>
      `;
      
      // Crear contenedor de toasts si no existe
      if (!$('#toast-container').length) {
        $('body').append('<div id="toast-container" class="toast-container position-fixed bottom-0 end-0 p-3"></div>');
      }
      
      $('#toast-container').append(toastHtml);
      const toastElement = $('#toast-container .toast').last()[0];
      const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
      toast.show();
    }
  }
  
  function formatPrice(price) {
    return parseFloat(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }
});
