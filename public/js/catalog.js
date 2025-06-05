$(function() {
  // Definir la URL base de la API
  const API_BASE_URL = window.API_BASE_URL || 'https://backmotos.onrender.com/api';
  
  // Verificar autenticación (opcional para catálogo)
  const token = localStorage.getItem('token');
  
  // Cargar la navbar adecuada
  const role = localStorage.getItem('role');
  const partial = token
    ? (role === 'ROLE_ADMIN' ? 'navbar-admin' : 'navbar-user')
    : 'navbar-guest';
  
  $('#navbar-container').load(`/partials/${partial}`);
  
  // Variables para paginación
  let currentPage = 0;
  let pageSize = 9;
  let totalPages = 0;
  let selectedCategory = '';
  let searchTerm = '';
  
  // Crear contenedor de toasts si no existe
  if (!$('#toast-container').length) {
    $('body').append('<div id="toast-container" class="toast-container position-fixed bottom-0 end-0 p-3"></div>');
  }
  
  // Cargar categorías
  loadCategories();
  
  // Cargar productos
  loadProducts();
  
  // Event listeners - Modificar para que se cancelen mutuamente
  $('#category-filter').on('change', function() {
    selectedCategory = $(this).val();
    // Limpiar búsqueda cuando se selecciona una categoría
    searchTerm = '';
    $('#search-input').val('');
    currentPage = 0;
    loadProducts();
  });
  
  $('#search-btn').on('click', function() {
    searchTerm = $('#search-input').val().trim();
    // Limpiar categoría cuando se realiza una búsqueda
    if (searchTerm) {
      selectedCategory = '';
      $('#category-filter').val('');
    }
    currentPage = 0;
    loadProducts();
  });
  
  $('#search-input').on('keypress', function(e) {
    if (e.which === 13) {
      searchTerm = $(this).val().trim();
      // Limpiar categoría cuando se realiza una búsqueda
      if (searchTerm) {
        selectedCategory = '';
        $('#category-filter').val('');
      }
      currentPage = 0;
      loadProducts();
    }
  });
  
  // Event delegation para elementos dinámicos
  $('#products-container').on('click', '.add-to-cart', function() {
    // Verificar si el usuario está autenticado
    if (!token) {
      showToast('error', 'Debes iniciar sesión para añadir productos al carrito');
      return;
    }
    
    const productId = $(this).data('id');
    const productName = $(this).closest('.product-card').find('.card-title').text();
    const productPrice = $(this).closest('.product-card').find('.product-price').text();
    const productImage = $(this).closest('.product-card').find('.product-image').attr('src');
    
    // Configurar los datos en el modal con los IDs CORREGIDOS
    $('#product-id').val(productId);
    $('#quantity-product-name').text(productName);
    $('#quantity-product-price').text(productPrice);
    $('#quantity-product-image').attr('src', productImage || '/img/no-image.png');
    $('#product-quantity').val(1); // Resetear cantidad a 1
    
    // Mostrar el modal
    $('#quantity-modal').modal('show');
  });
  
  // Event delegation para elementos dinámicos - Añadir evento para "Ver detalles"
  $('#products-container').on('click', '.view-details', function(e) {
    e.preventDefault(); // Evitar navegación a otra página
    
    const productId = $(this).data('id');
    loadProductDetails(productId);
    $('#product-detail-modal').modal('show');
  });
  
  // Manejadores para los botones de aumentar/disminuir cantidad
  $('#increase-modal-quantity').on('click', function() {
    const $quantity = $('#product-quantity');
    let value = parseInt($quantity.val()) || 1;
    $quantity.val(value + 1);
  });
  
  $('#decrease-modal-quantity').on('click', function() {
    const $quantity = $('#product-quantity');
    let value = parseInt($quantity.val()) || 2;
    if (value > 1) {
      $quantity.val(value - 1);
    }
  });
  
  $('#confirm-add-to-cart').on('click', function() {
    const productId = $('#product-id').val();
    const quantity = $('#product-quantity').val();
    
    addToCart(productId, quantity);
  });
  
  // Funciones
  function loadCategories() {
    $.ajax({
      url: API_BASE_URL + '/categorias/simple',  // Endpoint correcto para categorías simples
      type: 'GET',
      success: function(data) {
        const $select = $('#category-filter');
        
        if (Array.isArray(data)) {
          data.forEach(category => {
            $select.append(
              $('<option></option>')
                .attr('value', category.idCategoria)
                .text(category.nombre)  // Cambio de catNombre a nombre
            );
          });
        }
      },
      error: function(xhr) {
        console.error('Error al cargar categorías:', xhr);
      }
    });
  }
  
  function loadProducts() {
    $('#loading-products').show();
    $('#products-container').empty();
    
    // Añadir indicador visual de filtro activo
    updateActiveFilterIndicator();

    // Construir la URL correcta para cargar los productos
    let url = API_BASE_URL;
    
    if (searchTerm && searchTerm.trim() !== '') {
      // Endpoint de búsqueda
      url += `/productos/buscar?nombre=${encodeURIComponent(searchTerm)}`;
    } else if (selectedCategory) {
      // Endpoint por categoría
      url += `/productos/categoria/${selectedCategory}`;
    } else {
      // Endpoint para todos los productos
      url += '/productos/todos'; // Asegurar que siempre usamos el endpoint correcto
    }
    
    console.log('Cargando productos desde:', url);
    
    try {
      $.ajax({
        url: url,
        type: 'GET',
        global: false, // Evitar que se disparen errores globales
        success: function(data) {
          $('#loading-products').hide();
          
          if (Array.isArray(data) && data.length > 0) {
            renderProducts(data);
          } else if (data.content && Array.isArray(data.content) && data.content.length > 0) {
            renderProducts(data.content);
            renderPagination(data);
          } else {
            $('#products-container').html(
              '<div class="col-12 text-center">' +
              '<p class="alert alert-info">No se encontraron productos</p>' +
              '</div>'
            );
          }
        },
        error: function(xhr) {
          $('#loading-products').hide();
          console.error('Error al cargar productos:', xhr);
          $('#products-container').html(
            '<div class="col-12 text-center">' +
            '<p class="alert alert-danger">Error al cargar productos. Por favor intenta nuevamente.</p>' +
            '</div>'
          );
        }
      });
    } catch (error) {
      console.error('Error en la solicitud:', error);
      $('#loading-products').hide();
      $('#products-container').html(
        '<div class="col-12 text-center">' +
        '<p class="alert alert-danger">Error al conectar con el servidor.</p>' +
        '</div>'
      );
    }
  }
  
  // Función para cargar detalles del producto seleccionado
  function loadProductDetails(productId) {
    $('#product-detail-loading').show();
    $('#product-detail-content').hide();
    $('#product-detail-error').hide();
    
    $.ajax({
      url: `${API_BASE_URL}/integracion/productos/${productId}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      success: function(data) {
        console.log('Detalles del producto:', data);
        console.log('Precio sin procesar:', data.prodPrecio, typeof data.prodPrecio);
        
        // Actualizar el contenido del modal con los detalles del producto
        $('#modal-product-name').text(data.prodNombre);
        $('#modal-product-description').text(data.prodDescripcion);
        
        // SUPER CORRECCIÓN: Forzar actualización del precio y verificar que se estableció correctamente
        const precioNumerico = Number(data.prodPrecio);
        const precioFormateado = precioNumerico.toFixed(2);
        
        console.log('Precio convertido:', precioNumerico, 'Precio formateado:', precioFormateado);
        
        // Actualizar DIRECTAMENTE con jQuery y verificar después
        $('#modal-product-price').text(precioFormateado);
        
        // Verificación de que se estableció correctamente
        console.log('Precio establecido en el elemento:', $('#modal-product-price').text());
        
        $('#modal-product-stock').text(data.prodStock);
        $('#modal-product-category').text(data.prodCategoria || 'No disponible');
        $('#modal-product-provider').text(data.prodProveedor || 'No disponible');
        
        // Manejar imágenes del producto (usando prodImg)
        const $carousel = $('#modal-product-images');
        $carousel.empty();
        
        if (data.prodImg && Array.isArray(data.prodImg) && data.prodImg.length > 0) {
          data.prodImg.forEach((img, index) => {
            $carousel.append(`
              <div class="carousel-item ${index === 0 ? 'active' : ''}">
                <img src="${img}" class="d-block w-100 modal-product-img" alt="Imagen ${index + 1}" 
                  onerror="this.src='/img/no-image.png'">
              </div>
            `);
          });
        } else {
          $carousel.append(`
            <div class="carousel-item active">
              <img src="/img/no-image.png" class="d-block w-100 modal-product-img" alt="Imagen no disponible">
            </div>
          `);
        }
        
        // Ocultar cargador y mostrar contenido
        $('#product-detail-loading').hide();
        $('#product-detail-content').show();
        
        // Configurar el botón "Añadir al carrito" del modal
        $('#modal-add-to-cart').data('id', productId);
        $('#modal-add-to-cart').prop('disabled', data.prodStock <= 0);
        
        // Actualizar clase del botón según stock
        if (data.prodStock <= 0) {
          $('#modal-add-to-cart').removeClass('btn-success').addClass('btn-secondary');
          $('#modal-stock-badge').removeClass('bg-success bg-warning').addClass('bg-danger').text('Sin stock');
        } else if (data.prodStock <= 5) {
          $('#modal-add-to-cart').removeClass('btn-secondary').addClass('btn-success');
          $('#modal-stock-badge').removeClass('bg-success bg-danger').addClass('bg-warning').text(`Stock: ${data.prodStock}`);
        } else {
          $('#modal-add-to-cart').removeClass('btn-secondary').addClass('btn-success');
          $('#modal-stock-badge').removeClass('bg-warning bg-danger').addClass('bg-success').text(`Stock: ${data.prodStock}`);
        }
      },
      error: function(xhr) {
        console.error('Error al cargar detalles del producto:', xhr);
        
        // Mostrar mensaje de error
        $('#product-detail-loading').hide();
        $('#product-detail-error').show();
        setTimeout(() => {
          $('#product-detail-modal').modal('hide');
          $('#product-detail-error').hide();
        }, 3000);
      }
    });
  }
  
  // Añadir event listener para el botón "Añadir al carrito" dentro del modal
  $(document).on('click', '#modal-add-to-cart', function() {
    const productId = $(this).data('id');
    
    // Mostrar el modal de cantidad con los IDs CORREGIDOS
    $('#product-id').val(productId);
    $('#product-quantity').val(1); // Resetear cantidad a 1
    $('#product-detail-modal').modal('hide');
    
    // Opcional: Podemos recuperar los datos para mostrarlos en el modal de cantidad
    const productName = $('#modal-product-name').text();
    const productPrice = $('#modal-product-price').text();
    const productImage = $('#modal-product-images .carousel-item.active img').attr('src');
    
    $('#quantity-product-name').text(productName);
    $('#quantity-product-price').text(productPrice);
    $('#quantity-product-image').attr('src', productImage || '/img/no-image.png');
    
    $('#quantity-modal').modal('show');
  });
  
  function renderProducts(products) {
    const $container = $('#products-container');
    
    console.log('Total productos recibidos:', products.length);
    
    products.forEach(product => {
      // Mapear los campos correctamente
      const id = product.idProducto;
      const name = product.prodNombre;
      const description = product.prodDescripcion;
      const price = product.prodPrecio;
      const stock = product.prodStock;
      
      // Antes de procesar la imagen, imprimir el objeto completo para depuración
      console.log('Producto completo:', product);
      
      // Manejar específicamente el array imagenesUrl
      let imageUrl = '/img/no-image.png';
      
      if (product.imagenesUrl && Array.isArray(product.imagenesUrl) && product.imagenesUrl.length > 0) {
        // Filtrar URLs inválidas o de ejemplo
        const validImages = product.imagenesUrl.filter(url => 
          url && 
          typeof url === 'string' && 
          !url.includes('ejemplo.com') && 
          url.trim() !== '');
        
        if (validImages.length > 0) {
          imageUrl = validImages[0];
          console.log(`Imagen seleccionada para ${name}:`, imageUrl);
        } else {
          console.log(`No se encontraron imágenes válidas para ${name}`);
        }
      } else {
        console.log(`El producto ${name} no tiene imágenes`);
      }
      
      const $card = $(`
        <div class="col-md-4 col-sm-6 mb-4">
          <div class="card h-100 product-card">
            <div class="product-image-container">
              <img 
                src="${imageUrl}" 
                class="card-img-top product-image" 
                alt="${name}"
                onerror="this.onerror=null; this.src='/img/no-image.png'; console.log('Error cargando imagen:', this.getAttribute('data-original-src'));"
                data-original-src="${imageUrl}"
                loading="lazy"
              >
            </div>
            <div class="card-body">
              <h5 class="card-title">${name}</h5>
              <p class="card-text">${truncateText(description, 100)}</p>
              <div class="d-flex justify-content-between align-items-center">
                <p class="card-text mb-0"><strong>Precio: $<span class="product-price">${formatPrice(price)}</span></strong></p>
                <span class="badge ${stock > 5 ? 'bg-success' : stock > 0 ? 'bg-warning' : 'bg-danger'}">
                  Stock: ${stock}
                </span>
              </div>
            </div>
            <div class="card-footer d-flex justify-content-between">
              <a href="#" class="btn btn-success btn-sm view-details" data-id="${id}">
                <i class="bi bi-eye"></i> Ver detalles
              </a>
              <button class="btn btn-primary btn-sm add-to-cart" data-id="${id}" ${stock <= 0 ? 'disabled' : ''}>
                <i class="bi bi-cart-plus"></i> Añadir al carrito
              </button>
            </div>
          </div>
        </div>
      `);
      
      $container.append($card);
    });
  }
  
  function renderPagination(data) {
    const $pagination = $('#pagination');
    $pagination.empty();
    
    totalPages = data.totalPages || 1;
    
    if (totalPages <= 1) return;
    
    $pagination.append(`
      <li class="page-item ${currentPage === 0 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage - 1}">&laquo;</a>
      </li>
    `);
    
    for (let i = 0; i < totalPages; i++) {
      if (totalPages > 7 && i > 1 && i < totalPages - 2) {
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
    
    $pagination.append(`
      <li class="page-item ${currentPage === totalPages - 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage + 1}">&raquo;</a>
      </li>
    `);
    
    $pagination.find('.page-link').on('click', function(e) {
      e.preventDefault();
      const page = parseInt($(this).data('page'));
      
      if (!isNaN(page) && page >= 0 && page < totalPages) {
        currentPage = page;
        loadProducts();
      }
    });
  }
  
  function addToCart(productId, quantity) {
    // Validación previa en el cliente
    if (quantity <= 0) {
      showToast('error', 'La cantidad debe ser mayor a cero');
      return;
    }
    
    $.ajax({
      url: API_BASE_URL + '/carrito/agregar',
      type: 'POST',
      global: false, // Evitar que se disparen errores globales
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: JSON.stringify({
        idProducto: productId,
        cantidad: parseInt(quantity)
      }),
      success: function(data) {
        $('#quantity-modal').modal('hide');
        
        // Mostrar toast y animación de confeti
        showToast('success', data.mensaje || 'Producto añadido al carrito');
        showAddToCartConfetti();
        
        // Resetear el valor de cantidad
        $('#product-quantity').val(1);
        
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
        $('#quantity-modal').modal('hide');
        
        let mensaje = 'Error al añadir el producto al carrito';
        
        // Manejar códigos de estado específicos
        switch (xhr.status) {
          case 400:
            mensaje = 'La cantidad debe ser mayor a cero';
            break;
          case 404:
            mensaje = 'El producto no existe o no está disponible';
            break;
          case 409:
            mensaje = 'No hay suficiente stock para la cantidad solicitada. Recargue la página para ver el stock actual.';
            break;
          case 401:
            mensaje = 'Sesión expirada. Por favor inicie sesión nuevamente';
            // Redireccionar al login si la sesión expiró
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            setTimeout(function() {
              window.location.href = '/';
            }, 2000);
            break;
        }
        
        // Usar mensaje específico del servidor si está disponible
        if (xhr.responseJSON && xhr.responseJSON.mensaje) {
          mensaje = xhr.responseJSON.mensaje + '. Recargue la página para ver el stock actualizado.';
        }
        
        showToast('error', mensaje);
      }
    });
  }
  
  // Función unificada para mostrar toast usando la función global si está disponible
  function showToast(type, message) {
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
      
      $('#toast-container').append(toastHtml);
      const toastElement = $('.toast').last()[0];
      const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
      toast.show();
    }
  }
  
  function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
  
  // Mejorada para garantizar que el precio se muestre correctamente
  function formatPrice(price) {
    console.log('Formateando precio:', price);
    
    if (price === undefined || price === null) {
      console.log('Precio indefinido o nulo');
      return '0.00';
    }
    
    // Convertir a número para asegurar formato correcto
    let numericPrice;
    try {
      numericPrice = parseFloat(price);
      if (isNaN(numericPrice)) {
        console.log('No se pudo convertir el precio a número');
        return '0.00';
      }
    } catch (error) {
      console.error('Error al convertir precio:', error);
      return '0.00';
    }
    
    console.log('Precio numérico:', numericPrice);
    // Formatear con 2 decimales y separadores de miles
    return numericPrice.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }

  // Nueva función para mostrar visualmente qué filtro está activo
  function updateActiveFilterIndicator() {
    // Añadir clases visuales para indicar filtro activo
    if (searchTerm) {
      $('#search-input').addClass('border-primary');
      $('#category-filter').removeClass('border-primary');
    } else if (selectedCategory) {
      $('#category-filter').addClass('border-primary');
      $('#search-input').removeClass('border-primary');
    } else {
      $('#search-input').removeClass('border-primary');
      $('#category-filter').removeClass('border-primary');
    }
  }
  
  // Función para mostrar confeti cuando se añade al carrito con éxito
  function showAddToCartConfetti() {
    // Añadir CSS necesario dinámicamente
    const confettiStyle = document.createElement('style');
    confettiStyle.textContent = `
      .confetti-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
      }
      .confetti {
        position: absolute;
        width: 10px;
        height: 10px;
        background-color: #4CAF50;
        opacity: 0;
        animation: fall 3s ease-out forwards;
        transform: rotate(0deg);
      }
      @keyframes fall {
        0% {
          opacity: 1;
          top: -10px;
          transform: translateX(0) rotate(0deg);
        }
        100% {
          opacity: 0;
          top: 100%;
          transform: translateX(100px) rotate(360deg);
        }
      }
    `;
    document.head.appendChild(confettiStyle);
    
    // Crear contenedor para confeti
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    document.body.appendChild(confettiContainer);
    
    // Crear y animar piezas de confeti
    const colors = ['#4CAF50', '#2E7D32', '#8BC34A', '#FFC107', '#FF9800'];
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.width = `${Math.random() * 10 + 5}px`;
      confetti.style.height = `${Math.random() * 10 + 5}px`;
      confetti.style.animationDelay = `${Math.random() * 2}s`;
      confetti.style.animationDuration = `${Math.random() * 3 + 2}s`;
      confettiContainer.appendChild(confetti);
    }
    
    // Eliminar el confeti después de 5 segundos
    setTimeout(() => {
      confettiContainer.remove();
      confettiStyle.remove();
    }, 5000);
  }
});
