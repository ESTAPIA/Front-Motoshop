$(function() {
  // Verificar autenticación
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/auth/login?redirect=/cart';
    return;
  }
  
  // Variables globales
  let productToRemove = null;
  
  // Cargar navbar y datos del carrito
  loadNavbar();
  loadCart();
  
  // Event handlers para eliminar productos
  $(document).on('click', '.remove-item', function() {
    const productId = $(this).data('id');
    const productName = $(this).closest('tr').find('.product-name').text();
    
    // Reemplazar modal con toast de confirmación
    showConfirmationToast(
      'Eliminar producto',
      `¿Deseas eliminar "${productName}" del carrito?`,
      () => removeFromCart(productId)
    );
  });
  
  // Event handlers para actualizar cantidades
  $(document).on('click', '.decrease-quantity', function() {
    const productId = $(this).data('id');
    const currentQty = parseInt($(this).siblings('.item-quantity').text());
    
    // Si la cantidad actual es 1 y se intenta disminuir, mostrar toast de confirmación
    if (currentQty === 1) {
      const productName = $(this).closest('tr').find('.product-name').text();
      showConfirmationToast(
        'Eliminar producto',
        `¿Deseas eliminar "${productName}" del carrito?`,
        () => removeFromCart(productId)
      );
    } else {
      updateQuantity(productId, currentQty - 1);
    }
  });
  
  $(document).on('click', '.increase-quantity', function() {
    const productId = $(this).data('id');
    const currentQty = parseInt($(this).siblings('.item-quantity').text());
    updateQuantity(productId, currentQty + 1);
  });
  
  // Event handler para vaciar el carrito
  $(document).on('click', '#empty-cart-btn', function() {
    showConfirmationToast(
      'Vaciar carrito',
      '¿Estás seguro de que deseas eliminar todos los productos del carrito?',
      () => emptyCart()
    );
  });
  
  // Botón de checkout
  $(document).on('click', '#checkout-btn', function() {
    window.location.href = '/checkout';
  });
  
  // Funciones principales
  function loadNavbar() {
    const role = localStorage.getItem('role');
    const partial = role === 'ROLE_ADMIN' ? 'navbar-admin' : 'navbar-user';
    $('#navbar-container').load(`/partials/${partial}`);
  }
  
  function loadCart() {
    $.ajax({
      url: window.API_BASE_URL + '/carrito',
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        renderCart(data);
      },
      error: function(xhr) {
        console.error('Error al cargar el carrito:', xhr);
        
        if (xhr.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          window.location.href = '/auth/login?redirect=/cart';
          return;
        }
        
        $('#cart-container').html(`
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            Error al cargar el carrito. Por favor, intenta nuevamente.
          </div>
        `);
      }
    });
  }
    function renderCart(cart) {
    console.log('Datos del carrito recibidos:', cart);
    
    if (!cart.items || cart.items.length === 0) {
      console.log('Carrito vacío detectado');
      $('#cart-container').html(`
        <div class="empty-cart-state">
          <i class="bi bi-cart-x empty-cart-icon"></i>
          <h4 class="empty-cart-title">Tu carrito está vacío</h4>
          <p class="empty-cart-message">No hay productos en tu carrito de compras.</p>
          <a href="/catalog" class="btn btn-success btn-view-catalog">
            <i class="bi bi-grid me-2"></i>Ver catálogo
          </a>
        </div>
      `);
      $('#cart-total').text('$0.00');
      $('#cart-subtotal').text('$0.00');
      $('#checkout-btn').prop('disabled', true);
      $('#empty-cart-btn').hide();
      $('#cart-items-count span').text('0 productos');
      return;
    }
    
    let html = `
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Producto</th>
              <th class="text-center">Precio</th>
              <th class="text-center">Cantidad</th>
              <th class="text-end">Subtotal</th>
              <th class="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
    `;
      cart.items.forEach(item => {
      console.log('Procesando item:', item);
      
      // Mejorar el manejo de imágenes
      let imageUrl = '/img/no-image.png';
      
      // Verificar si existe una imagen válida
      if (item.imagenesUrl && Array.isArray(item.imagenesUrl) && item.imagenesUrl.length > 0) {
        // Filtrar URLs inválidas o de ejemplo
        const validImages = item.imagenesUrl.filter(url => 
          url && 
          typeof url === 'string' && 
          !url.includes('ejemplo.com') && 
          url.trim() !== '');
        
        if (validImages.length > 0) {
          imageUrl = validImages[0];
        }
      } else if (item.imagen && typeof item.imagen === 'string' && item.imagen.trim() !== '') {
        // Soporte para el formato anterior donde la imagen venía en propiedad "imagen"
        imageUrl = item.imagen;
      }
      
      // Calcular subtotal
      const subtotal = item.precio * item.cantidad;
      
      html += `
        <tr data-product-id="${item.idProducto}">
          <td data-label="Producto">
            <div class="product-info-cell">
              <div class="cart-image-container">
                <img src="${imageUrl}" 
                     alt="${item.nombre}" 
                     class="cart-item-image"
                     onerror="this.src='/img/no-image.png'">
              </div>
              <div class="product-details">
                <h6 class="product-name">${truncateText(item.nombre, 50)}</h6>
                <p class="product-description">${truncateText(item.descripcion || 'Sin descripción', 80)}</p>
              </div>
            </div>
          </td>
          <td data-label="Precio" class="text-center">
            <span class="price-display">$${formatPrice(item.precio)}</span>
          </td>
          <td data-label="Cantidad" class="text-center">
            <div class="quantity-control">
              <button type="button" class="decrease-quantity" data-id="${item.idProducto}" title="Disminuir cantidad">
                <i class="bi bi-dash"></i>
              </button>
              <span class="item-quantity">${item.cantidad}</span>
              <button type="button" class="increase-quantity" data-id="${item.idProducto}" title="Aumentar cantidad">
                <i class="bi bi-plus"></i>
              </button>
            </div>
          </td>
          <td data-label="Subtotal" class="text-end">
            <span class="price-display">$${formatPrice(subtotal)}</span>
          </td>
          <td data-label="Acciones" class="text-center">
            <button type="button" class="btn btn-outline-danger btn-sm remove-item" 
                    data-id="${item.idProducto}" title="Eliminar producto">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    $('#cart-container').html(html);
    $('#cart-total').text(`$${formatPrice(cart.total)}`);
    $('#cart-subtotal').text(`$${formatPrice(cart.total)}`);
    
    // Actualizar contador de items
    const itemCount = cart.items.length;
    const itemText = itemCount === 1 ? 'producto' : 'productos';
    $('#cart-items-count span').text(`${itemCount} ${itemText}`);
    
    if (cart.items && cart.items.length > 0) {
      $('#checkout-btn').prop('disabled', false);
      $('#empty-cart-btn').show();
    } else {
      $('#checkout-btn').prop('disabled', true);
      $('#empty-cart-btn').hide();
    }
    
    // Agregar efecto de aparición
    $('.table tbody tr').hide().fadeIn(300);
  }
  
  function removeFromCart(productId) {
    $.ajax({
      url: window.API_BASE_URL + '/carrito/quitar',
      type: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: JSON.stringify({
        idProducto: productId
      }),
      success: function(data) {
        showToast('success', 'Producto eliminado del carrito');
        loadCart();
        
        // Actualizar contador global del carrito
        if (typeof updateCartCounter === 'function') {
          updateCartCounter();
        }
      },
      error: function(xhr) {
        showToast('error', 'Error al eliminar el producto');
        
        if (xhr.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          window.location.href = '/auth/login?redirect=/cart';
        }
      }
    });
  }
  
  function updateQuantity(productId, newQuantity) {
    // Agregar efecto visual de actualización
    const $row = $(`tr[data-product-id="${productId}"]`);
    $row.addClass('updating');
    
    $.ajax({
      url: window.API_BASE_URL + '/carrito/actualizar-cantidad',
      type: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: JSON.stringify({
        idProducto: productId,
        cantidad: newQuantity
      }),
      global: false,      success: function(data) {
        console.log('Respuesta de actualizar cantidad:', data);
        
        // Remover efecto de actualización
        $row.removeClass('updating');
        
        // Agregar efecto de éxito
        $row.addClass('success-flash');
        setTimeout(() => {
          $row.removeClass('success-flash');
        }, 600);
        
        // Recargar el carrito completo en lugar de usar la respuesta de actualización
        loadCart();
        
        // Actualizar contador global del carrito
        if (typeof updateCartCounter === 'function') {
          updateCartCounter();
        }
        
        showToast('success', 'Cantidad actualizada correctamente');
      },
      error: function(xhr) {
        // Remover efecto de actualización
        $row.removeClass('updating');
        
        let errorMsg = 'Error al actualizar la cantidad';
        
        if (xhr.status === 409) {
          errorMsg = 'No hay suficiente stock disponible para la cantidad solicitada';
        } else if (xhr.responseJSON && xhr.responseJSON.error) {
          errorMsg = xhr.responseJSON.error;
        }
        
        showToast('error', errorMsg);
        
        if (xhr.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          window.location.href = '/auth/login?redirect=/cart';
        }
      }
    });
  }
  
  function emptyCart() {
    $.ajax({
      url: window.API_BASE_URL + '/carrito',
      type: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        showToast('success', 'Carrito vaciado con éxito');
        loadCart();
        
        // Actualizar contador global del carrito
        if (typeof updateCartCounter === 'function') {
          updateCartCounter();
        }
      },
      error: function(xhr) {
        showToast('error', 'Error al vaciar el carrito');
        
        if (xhr.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          window.location.href = '/auth/login?redirect=/cart';
        }
      }
    });
  }
  
  // Mostrar toast con botones de confirmación
  function showConfirmationToast(title, message, onConfirm) {
    const toastId = 'confirm-toast-' + Date.now();
    const toastHtml = `
      <div class="toast" id="${toastId}" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="toast-header bg-warning text-dark">
          <strong class="me-auto">${title}</strong>
          <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
          <p>${message}</p>
          <div class="mt-2 pt-2 border-top d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="toast">Cancelar</button>
            <button type="button" class="btn btn-sm btn-danger confirm-btn">Confirmar</button>
          </div>
        </div>
      </div>
    `;
    
    // Agregar al contenedor
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      document.body.appendChild(container);
    }
    
    $('#toast-container').append(toastHtml);
    
    // Configurar el toast
    const toastElement = $(`#${toastId}`);
    const toast = new bootstrap.Toast(toastElement.get(0), { 
      autohide: false
    });
    
    // Agregar event listeners
    toastElement.find('.confirm-btn').on('click', function() {
      toast.hide();
      onConfirm();
    });
    
    toastElement.on('hidden.bs.toast', function() {
      // Eliminar el elemento toast del DOM cuando se oculta
      $(this).remove();
    });
    
    // Mostrar
    toast.show();
  }
  
  // Funciones auxiliares
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
      // Fallback al comportamiento actual si la función global no está disponible
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
      
      const toastContainer = document.getElementById('toast-container');
      if (!toastContainer) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
      }
      
      $('#toast-container').append(toastHtml);
      const toastElement = $('.toast').last()[0];
      const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
      toast.show();
    }
  }
});
