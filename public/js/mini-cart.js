// Funcionalidad para el mini-carrito que aparece en el modal
$(function() {
  // Cargar contador de carrito al inicializar
  updateCartCounter();
  
  // Evento global para actualizar el contador cuando se añadan productos
  $(document).on('cartUpdated', function() {
    updateCartCounter();
  });
  
  // Event listeners para los botones de incremento/decremento en el mini-carrito
  $(document).on('click', '.mini-cart-decrease', function() {
    const productId = $(this).data('id');
    const currentQty = parseInt($(this).siblings('.mini-cart-quantity').text());
    
    if (currentQty === 1) {
      // Confirmar eliminación si la cantidad es 1
      if (confirm('¿Deseas eliminar este producto del carrito?')) {
        removeFromMiniCart(productId);
      }
    } else {
      updateCartItemQuantity(productId, currentQty - 1);
    }
  });
  
  $(document).on('click', '.mini-cart-increase', function() {
    const productId = $(this).data('id');
    const currentQty = parseInt($(this).siblings('.mini-cart-quantity').text());
    updateCartItemQuantity(productId, currentQty + 1);
  });
  
  // Evento para vaciar el carrito - MODIFICADO: usar toast en lugar de confirm
  $(document).on('click', '#mini-cart-empty-btn', function(e) {
    e.preventDefault();
    
    // Reemplazamos el confirm nativo con nuestro toast personalizado
    showConfirmationToast(
      'Vaciar carrito',
      '¿Estás seguro que deseas vaciar tu carrito? Esta acción no se puede deshacer.',
      emptyCart
    );
  });
});

/**
 * Carga el contenido del carrito en el modal
 */
function loadMiniCart() {
  const token = localStorage.getItem('token');
  if (!token) return;
  
  $('#mini-cart-loading').show();
  $('#mini-cart-content').empty();
  
  $.ajax({
    url: window.API_BASE_URL + '/carrito',
    type: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    success: function(data) {
      $('#mini-cart-loading').hide();
      renderMiniCart(data);
    },
    error: function(xhr) {
      $('#mini-cart-loading').hide();
      $('#mini-cart-content').html(`
        <div class="alert alert-danger py-2">
          <small><i class="bi bi-exclamation-triangle-fill me-2"></i>Error al cargar el carrito</small>
        </div>
      `);
    }
  });
}

/**
 * Actualiza el contador del carrito en la navbar
 * Usando el endpoint correcto: carrito/count
 */
function updateCartCounter() {
  const token = localStorage.getItem('token');
  if (!token) {
    $('#cart-counter').text('0');
    return;
  }
  
  $.ajax({
    url: window.API_BASE_URL + '/carrito/count',
    type: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    success: function(data) {
      const count = data.cantidad || 0;
      $('#cart-counter').text(count);
      
      // Ocultar el contador si es cero
      if (count === 0) {
        $('#cart-counter').hide();
      } else {
        $('#cart-counter').show();
      }
    },
    error: function() {
      $('#cart-counter').text('0').hide();
    }
  });
}

/**
 * Renderiza el contenido del mini-carrito en el modal
 */
function renderMiniCart(cart) {
  if (!cart.items || cart.items.length === 0) {
    $('#mini-cart-content').html(`
      <div class="text-center py-4">
        <i class="bi bi-cart-x fs-3 text-muted"></i>
        <p class="mt-2 text-muted">Tu carrito está vacío</p>
        <a href="/catalog" class="btn btn-sm btn-outline-primary mt-2" data-bs-dismiss="modal">
          Ver productos
        </a>
      </div>
    `);
    $('#mini-cart-total').text('$0.00');
    
    // Ocultar el botón de vaciar carrito cuando está vacío
    $('.mini-cart-empty-container').hide();
    updateFooterButtons(false); // Actualizar estado de botones del footer
    return;
  }
  
  // Mostrar el botón de vaciar carrito
  $('.mini-cart-empty-container').show();
  
  let html = `<ul class="list-group list-group-flush mini-cart-items">`;
  
  cart.items.forEach(item => {
    let imageUrl = '/img/no-image.png';
    
    // Obtener imagen del producto si existe
    if (item.imagenesUrl && Array.isArray(item.imagenesUrl) && item.imagenesUrl.length > 0) {
      // Filtrar URLs inválidas
      const validImages = item.imagenesUrl.filter(url => 
        url && 
        typeof url === 'string' && 
        !url.includes('ejemplo.com') && 
        url.trim() !== '');
      
      if (validImages.length > 0) {
        imageUrl = validImages[0];
      }
    } else if (item.imagen) {
      imageUrl = item.imagen;
    }
    
    html += `
      <li class="">
        <div class="d-flex">
          <div class="mini-cart-img-container me-2">
            <img src="${imageUrl}" class="mini-cart-img" alt="${item.nombre}" 
                onerror="this.onerror=null; this.src='/img/no-image.png';">
          </div>
          <div class="mini-cart-product-row">
            <!-- Nombre del producto completo sin recortar -->
            <h6 class="mb-1 fs-6">${item.nombre}</h6>
            
            <!-- Fila inferior con precio y controles -->
            <div class="mini-cart-bottom-row">
              <div>
                <div class="text-muted small">$${formatPrice(item.precio)}/u</div>
                <div class="fw-bold small">$${formatPrice(item.subtotal)}</div>
              </div>
              
              <div class="d-flex align-items-center">
                <!-- Controles de cantidad -->
                <div class="d-flex align-items-center me-2">
                  <button class="btn btn-sm btn-outline-secondary mini-cart-decrease" data-id="${item.idProducto}">-</button>
                  <span class="mini-cart-quantity mx-2">${item.cantidad}</span>
                  <button class="btn btn-sm btn-outline-secondary mini-cart-increase" data-id="${item.idProducto}">+</button>
                </div>
                
                <!-- Botón eliminar alineado a la derecha -->
                <button class="btn btn-sm btn-outline-danger mini-cart-remove" data-id="${item.idProducto}">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </li>
    `;
  });
  
  html += `</ul>`;
  
  $('#mini-cart-content').html(html);
  $('#mini-cart-total').text(`$${formatPrice(cart.total)}`);
  
  // Mostrar resumen de totales
  showCartSummary(cart);
  
  // Event listener para el botón de eliminar
  $('.mini-cart-remove').on('click', function() {
    const productId = $(this).data('id');
    removeFromMiniCart(productId);
  });
}

/**
 * Eliminar un producto del carrito directamente desde el mini-carrito
 */
function removeFromMiniCart(productId) {
  const token = localStorage.getItem('token');
  if (!token) return;
  
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
    success: function() {
      // Recargar mini-carrito y actualizar contador
      loadMiniCart();
      updateCartCounter();
      
      // Disparar evento global para actualizar otras vistas del carrito
      $(document).trigger('cartUpdated');
      
      if (typeof window.showGlobalToast === 'function') {
        window.showGlobalToast('success', 'Producto eliminado del carrito');
      }
    },
    error: function() {
      if (typeof window.showGlobalToast === 'function') {
        window.showGlobalToast('error', 'Error al eliminar el producto');
      }
    }
  });
}

/**
 * Actualizar la cantidad de un producto desde el mini-carrito
 */
function updateCartItemQuantity(productId, newQuantity) {
  const token = localStorage.getItem('token');
  if (!token) return;
  
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
    success: function() {
      // Recargar mini-carrito y actualizar contador
      loadMiniCart();
      
      // Disparar evento global para actualizar otras vistas del carrito
      $(document).trigger('cartUpdated');
      
      if (typeof window.showGlobalToast === 'function') {
        window.showGlobalToast('success', 'Cantidad actualizada');
      }
    },
    error: function(xhr) {
      let errorMsg = 'Error al actualizar la cantidad';
      
      // Personalizar mensaje según el código de error
      if (xhr.status === 409) {
        errorMsg = 'No hay suficiente stock disponible';
      } else if (xhr.responseJSON && xhr.responseJSON.mensaje) {
        errorMsg = xhr.responseJSON.mensaje;
      }
      
      if (typeof window.showGlobalToast === 'function') {
        window.showGlobalToast('error', errorMsg);
      }
      
      // Recargar carrito para mostrar las cantidades correctas
      loadMiniCart();
    }
  });
}

// Vaciar el carrito completamente
function emptyCart() {
  const token = localStorage.getItem('token');
  if (!token) return;
  
  $.ajax({
    url: window.API_BASE_URL + '/carrito',
    type: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    success: function() {
      // Recargar mini-carrito y actualizar contador
      loadMiniCart();
      updateCartCounter();
      
      if (typeof window.showGlobalToast === 'function') {
        window.showGlobalToast('success', 'Carrito vaciado con éxito');
      }
      
      // Disparar evento global para actualizar otras vistas del carrito
      $(document).trigger('cartUpdated');
    },
    error: function(xhr) {
      if (typeof window.showGlobalToast === 'function') {
        window.showGlobalToast('error', 'Error al vaciar el carrito');
      }
      
      if (xhr.status === 401) {
        // Sesión expirada
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    }
  });
}

/**
 * Mostrar toast con botones de confirmación
 */
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

// Función auxiliar para formatear precios
function formatPrice(price) {
  if (!price) return '0.00';
  return parseFloat(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Función para eliminar espaciado morado del modal
function fixModalSpacing() {
    const modal = document.getElementById('mini-cart-modal');
    if (modal) {
        // Eliminar cualquier padding o margin
        modal.style.padding = '0';
        modal.style.margin = '0';
        
        // Asegurar que el modal ocupe toda la pantalla
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100vh';
        modal.style.zIndex = '1055';
        
        const modalDialog = modal.querySelector('.modal-dialog');
        if (modalDialog) {
            modalDialog.style.position = 'fixed';
            modalDialog.style.top = '0';
            modalDialog.style.right = '0';
            modalDialog.style.bottom = '0';
            modalDialog.style.margin = '0';
            modalDialog.style.padding = '0';
            modalDialog.style.maxWidth = '450px';
            modalDialog.style.width = '450px';
            modalDialog.style.transform = 'none';
            modalDialog.style.minHeight = '100vh';
            modalDialog.style.maxHeight = '100vh';
        }
        
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.minHeight = '100vh';
            modalContent.style.margin = '0';
            modalContent.style.padding = '0';
            modalContent.style.borderRadius = '0';
            modalContent.style.position = 'absolute';
            modalContent.style.top = '0';
            modalContent.style.left = '0';
            modalContent.style.right = '0';
            modalContent.style.bottom = '0';
        }
    }
}

// Función para calcular y aplicar altura correcta del modal
function calculateModalHeight() {
    const modal = document.getElementById('mini-cart-modal');
    if (!modal) return;
    
    const modalDialog = modal.querySelector('.modal-dialog');
    const modalContent = modal.querySelector('.modal-content');
    const modalHeader = modal.querySelector('.modal-header');
    const modalFooter = modal.querySelector('.modal-footer');
    const modalBody = modal.querySelector('.modal-body');
    
    if (!modalDialog || !modalContent) return;
    
    // Obtener altura real de la ventana
    const windowHeight = window.innerHeight;
    
    // Establecer altura exacta sin espacios
    modalDialog.style.height = windowHeight + 'px';
    modalDialog.style.maxHeight = windowHeight + 'px';
    modalDialog.style.minHeight = windowHeight + 'px';
    
    modalContent.style.height = windowHeight + 'px';
    modalContent.style.maxHeight = windowHeight + 'px';
    modalContent.style.minHeight = windowHeight + 'px';
    
    // Calcular altura del body basado en header y footer reales
    if (modalHeader && modalFooter && modalBody) {
        const headerHeight = modalHeader.offsetHeight;
        const footerHeight = modalFooter.offsetHeight;
        const bodyHeight = windowHeight - headerHeight - footerHeight;
        
        modalBody.style.height = bodyHeight + 'px';
        modalBody.style.maxHeight = bodyHeight + 'px';
        modalBody.style.minHeight = bodyHeight + 'px';
    }
}

// Función mejorada para eliminar espaciado del modal
function forceRemoveModalSpacing() {
    const modal = document.getElementById('mini-cart-modal');
    
    if (modal) {
        // Eliminar padding del modal principal
        modal.style.setProperty('padding', '0', 'important');
        modal.style.setProperty('margin', '0', 'important');
        modal.style.setProperty('padding-left', '0', 'important');
        modal.style.setProperty('padding-right', '0', 'important');
        modal.style.setProperty('padding-top', '0', 'important');
        modal.style.setProperty('padding-bottom', '0', 'important');
        
        // Eliminar padding del body
        document.body.style.setProperty('padding-right', '0', 'important');
        document.body.style.setProperty('padding-left', '0', 'important');
        document.body.style.setProperty('padding-top', '0', 'important');
        document.body.style.setProperty('padding-bottom', '0', 'important');
        
        // Calcular y aplicar altura correcta
        calculateModalHeight();
        
        const modalDialog = modal.querySelector('.modal-dialog');
        if (modalDialog) {
            modalDialog.style.setProperty('margin', '0', 'important');
            modalDialog.style.setProperty('padding', '0', 'important');
            modalDialog.style.setProperty('position', 'fixed', 'important');
            modalDialog.style.setProperty('top', '0', 'important');
            modalDialog.style.setProperty('right', '0', 'important');
            modalDialog.style.setProperty('bottom', '0', 'important');
            modalDialog.style.setProperty('left', 'auto', 'important');
            modalDialog.style.setProperty('transform', 'none', 'important');
            modalDialog.style.setProperty('max-width', '450px', 'important');
            modalDialog.style.setProperty('width', '450px', 'important');
        }
        
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.setProperty('margin', '0', 'important');
            modalContent.style.setProperty('padding', '0', 'important');
            modalContent.style.setProperty('border-radius', '0', 'important');
            modalContent.style.setProperty('position', 'relative', 'important');
            modalContent.style.setProperty('width', '100%', 'important');
        }
    }
}

// Función para reajustar cuando cambia el tamaño de ventana
function handleWindowResize() {
    const modal = document.getElementById('mini-cart-modal');
    if (modal && modal.classList.contains('show')) {
        setTimeout(() => {
            calculateModalHeight();
            forceRemoveModalSpacing();
        }, 100);
    }
}

// Función para manejar correctamente la accesibilidad del modal
function fixModalAccessibility() {
    const modal = document.getElementById('mini-cart-modal');
    
    if (modal) {
        // Eliminar aria-hidden cuando el modal se muestra
        modal.addEventListener('show.bs.modal', function() {
            modal.removeAttribute('aria-hidden');
            modal.setAttribute('aria-modal', 'true');
            modal.style.display = 'block';
        });
        
        // Restaurar aria-hidden cuando el modal se oculta
        modal.addEventListener('hide.bs.modal', function() {
            modal.setAttribute('aria-hidden', 'true');
            modal.removeAttribute('aria-modal');
        });
        
        // Asegurar que está completamente oculto al inicio
        modal.addEventListener('hidden.bs.modal', function() {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
            modal.removeAttribute('aria-modal');
        });
        
        // Manejar el estado inicial
        if (!modal.classList.contains('show')) {
            modal.setAttribute('aria-hidden', 'true');
            modal.style.display = 'none';
        }
    }
}

// Función para mostrar el modal correctamente
function showMiniCart() {
    const modal = document.getElementById('mini-cart-modal');
    
    if (modal) {
        // Preparar el modal antes de mostrarlo
        modal.removeAttribute('aria-hidden');
        modal.setAttribute('aria-modal', 'true');
        
        const modalInstance = new bootstrap.Modal(modal, {
            backdrop: 'static',
            keyboard: false
        });
        
        modalInstance.show();
    }
}

// Función para ocultar el modal correctamente
function hideMiniCart() {
    const modal = document.getElementById('mini-cart-modal');
    const modalInstance = bootstrap.Modal.getInstance(modal);
    
    if (modalInstance) {
        modalInstance.hide();
    }
}

// Función para actualizar el estado de los botones del footer
function updateFooterButtons(hasItems) {
    const modal = document.getElementById('mini-cart-modal');
    if (!modal) return;
    
    if (hasItems) {
        modal.classList.add('mini-cart-has-items');
        modal.classList.remove('mini-cart-empty');
    } else {
        modal.classList.add('mini-cart-empty');
        modal.classList.remove('mini-cart-has-items');
    }
}

// Función para mostrar el resumen de totales
function showCartSummary(cartData) {
    const summarySection = document.querySelector('.mini-cart-summary');
    if (!summarySection || !cartData) return;
    
    // Actualizar valores
    const subtotalElement = document.getElementById('mini-cart-subtotal');
    const totalElement = document.getElementById('mini-cart-total');
    
    if (subtotalElement && cartData.subtotal) {
        subtotalElement.textContent = `$${cartData.subtotal.toFixed(2)}`;
    }
    
    if (totalElement && cartData.total) {
        totalElement.textContent = `$${cartData.total.toFixed(2)}`;
    }
    
    // Mostrar la sección de resumen
    summarySection.style.display = 'block';
    
    // Actualizar estado de botones
    updateFooterButtons(cartData.items && cartData.items.length > 0);
}

// Función para ocultar el resumen cuando el carrito está vacío
function hideCartSummary() {
    const summarySection = document.querySelector('.mini-cart-summary');
    if (summarySection) {
        summarySection.style.display = 'none';
    }
    
    // Actualizar estado de botones
    updateFooterButtons(false);
}

// Función para actualizar el resumen de totales en el footer
function updateMiniCartSummary(cartData) {
    const subtotalElement = document.getElementById('mini-cart-subtotal');
    const totalElement = document.getElementById('mini-cart-total');
    
    if (cartData && cartData.items && cartData.items.length > 0) {
        // Calcular totales
        let subtotal = 0;
        cartData.items.forEach(item => {
            subtotal += item.price * item.quantity;
        });
        
        // Actualizar elementos del DOM
        if (subtotalElement) {
            subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
        }
        
        if (totalElement) {
            totalElement.textContent = `$${subtotal.toFixed(2)}`;
        }
        
        // Habilitar botones
        enableCartButtons();
    } else {
        // Carrito vacío
        if (subtotalElement) {
            subtotalElement.textContent = '$0.00';
        }
        
        if (totalElement) {
            totalElement.textContent = '$0.00';
        }
        
        // Deshabilitar botones
        disableCartButtons();
    }
}

// Función para habilitar botones del carrito
function enableCartButtons() {
    const viewCartBtn = document.querySelector('.btn-view-cart');
    const checkoutBtn = document.querySelector('.btn-checkout');
    
    if (viewCartBtn) {
        viewCartBtn.disabled = false;
        viewCartBtn.style.opacity = '1';
    }
    
    if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.style.opacity = '1';
    }
}

// Función para deshabilitar botones del carrito
function disableCartButtons() {
    const viewCartBtn = document.querySelector('.btn-view-cart');
    const checkoutBtn = document.querySelector('.btn-checkout');
    
    if (viewCartBtn) {
        viewCartBtn.disabled = true;
        viewCartBtn.style.opacity = '0.6';
    }
    
    if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.style.opacity = '0.6';
    }
}

// Función para mostrar el modal del mini-carrito
function showMiniCart() {
    console.log('Abriendo mini-carrito...');
    const modal = document.getElementById('mini-cart-modal');
    
    if (modal) {
        // Asegurar que el footer esté visible
        const modalFooter = modal.querySelector('.cart-footer-modern');
        if (modalFooter) {
            modalFooter.style.display = 'flex';
            modalFooter.style.visibility = 'visible';
            modalFooter.style.opacity = '1';
        }
        
        // Mostrar el modal
        const modalInstance = new bootstrap.Modal(modal, {
            backdrop: 'static',
            keyboard: false
        });
        
        modalInstance.show();
        
        // Actualizar resumen (simular datos por ahora)
        updateMiniCartSummary({
            items: [] // Carrito vacío por defecto
        });
    } else {
        console.error('Modal del mini-carrito no encontrado');
    }
}

// Función para crear el footer del modal si no existe
function ensureModalFooterExists() {
    const modal = document.getElementById('mini-cart-modal');
    if (!modal) return;
    
    let modalFooter = modal.querySelector('.modal-footer');
    
    // Si no existe el footer, lo creamos
    if (!modalFooter) {
        console.log('Footer del modal no existe, creándolo...');
        
        const modalContent = modal.querySelector('.modal-content');
        if (!modalContent) return;
        
        // Crear el footer completo
        modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer cart-footer-modern';
        modalFooter.innerHTML = `
            <!-- Resumen de totales -->
            <div class="cart-summary-mini mb-3 w-100">
                <div class="summary-line d-flex justify-content-between">
                    <span class="summary-label">Subtotal:</span>
                    <span class="summary-value" id="mini-cart-subtotal">$0.00</span>
                </div>
                <div class="summary-line d-flex justify-content-between">
                    <span class="summary-label">Envío:</span>
                    <span class="summary-value shipping-free">
                        <i class="bi bi-gift me-1"></i>Gratis
                    </span>
                </div>
                <div class="summary-line d-flex justify-content-between">
                    <span class="summary-label">IVA incluido:</span>
                    <span class="summary-value tax-included">
                        <i class="bi bi-check-circle me-1"></i>Sí
                    </span>
                </div>
                <div class="summary-line d-flex justify-content-between border-top pt-2 mt-2">
                    <span class="summary-label total-label">
                        <strong><i class="bi bi-cart-check me-2"></i>Total:</strong>
                    </span>
                    <span class="summary-value total-value">
                        <strong id="mini-cart-total">$0.00</strong>
                    </span>
                </div>
            </div>
            
            <!-- Botones de acción -->
            <div class="mini-cart-actions w-100">
                <button type="button" class="btn btn-view-cart w-100 mb-2" onclick="window.location.href='/cart'">
                    <i class="bi bi-eye me-2"></i>Ver Carrito Completo
                </button>
                <button type="button" class="btn btn-checkout w-100" onclick="window.location.href='/checkout'">
                    <i class="bi bi-credit-card me-2"></i>Proceder al Checkout
                </button>
            </div>
        `;
        
        // Agregar el footer al modal
        modalContent.appendChild(modalFooter);
        console.log('Footer del modal creado exitosamente');
    }
    
    // Asegurar que el footer esté visible
    modalFooter.style.display = 'flex';
    modalFooter.style.flexDirection = 'column';
    modalFooter.style.visibility = 'visible';
    modalFooter.style.opacity = '1';
    
    return modalFooter;
}

// Función para actualizar el resumen de totales
function updateCartSummary(cartData) {
    const subtotalElement = document.getElementById('mini-cart-subtotal');
    const totalElement = document.getElementById('mini-cart-total');
    
    if (cartData && cartData.items && cartData.items.length > 0) {
        // Calcular totales basado en los datos del carrito
        let subtotal = 0;
        cartData.items.forEach(item => {
            subtotal += parseFloat(item.price) * parseInt(item.quantity);
        });
        
        if (subtotalElement) {
            subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
        }
        
        if (totalElement) {
            totalElement.textContent = `$${subtotal.toFixed(2)}`;
        }
        
        // Habilitar botones
        enableActionButtons();
    } else {
        // Carrito vacío - usar valores por defecto pero mantener botones habilitados
        if (subtotalElement) {
            subtotalElement.textContent = '$0.00';
        }
        
        if (totalElement) {
            totalElement.textContent = '$0.00';
        }
        
        // Mantener botones habilitados para navegación
        enableActionButtons();
    }
}

// Función para habilitar botones de acción
function enableActionButtons() {
    const viewCartBtn = document.querySelector('.btn-view-cart');
    const checkoutBtn = document.querySelector('.btn-checkout');
    
    if (viewCartBtn) {
        viewCartBtn.disabled = false;
        viewCartBtn.style.opacity = '1';
        viewCartBtn.style.pointerEvents = 'auto';
    }
    
    if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.style.opacity = '1';
        checkoutBtn.style.pointerEvents = 'auto';
    }
}

// Función mejorada para mostrar el modal
function showMiniCart() {
    console.log('Abriendo mini-carrito...');
    
    // Asegurar que el footer existe antes de mostrar el modal
    ensureModalFooterExists();
    
    const modal = document.getElementById('mini-cart-modal');
    if (modal) {
        const modalInstance = new bootstrap.Modal(modal, {
            backdrop: 'static',
            keyboard: false
        });
        
        modalInstance.show();
        
        // Actualizar resumen después de mostrar
        setTimeout(() => {
            updateCartSummary({ items: [] }); // Simular carrito vacío por ahora
        }, 100);
    }
}

// Función para interceptar y corregir el modal generado dinámicamente
function interceptModalGeneration() {
    // Observar cambios en el DOM para detectar cuando se genera el modal
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        // Verificar si es un modal de carrito
                        if (node.classList && node.classList.contains('modal') && 
                            (node.id === 'mini-cart-modal' || node.id === 'cartModal')) {
                            console.log('Modal de carrito detectado, verificando footer...');
                            setTimeout(() => {
                                ensureModalFooterExists();
                            }, 100);
                        }
                        
                        // También verificar nodos hijos
                        const cartModal = node.querySelector('#mini-cart-modal, #cartModal');
                        if (cartModal) {
                            console.log('Modal de carrito encontrado en nodo hijo, verificando footer...');
                            setTimeout(() => {
                                ensureModalFooterExists();
                            }, 100);
                        }
                    }
                });
            }
        });
    });
    
    // Observar cambios en el documento
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando mini-carrito...');
    
    // Interceptar generación dinámica de modales
    interceptModalGeneration();
    
    // Asegurar que el footer existe desde el inicio
    setTimeout(() => {
        ensureModalFooterExists();
    }, 500);
    
    // Verificar cada 2 segundos durante los primeros 10 segundos
    let checkCount = 0;
    const intervalId = setInterval(() => {
        ensureModalFooterExists();
        checkCount++;
        
        if (checkCount >= 5) {
            clearInterval(intervalId);
            console.log('Verificación de footer completada');
        }
    }, 2000);
    
    // Event listeners para botones de carrito
    const cartButtons = document.querySelectorAll('[data-bs-target="#mini-cart-modal"], [data-bs-target="#cartModal"]');
    cartButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Botón de carrito clickeado');
            setTimeout(() => {
                ensureModalFooterExists();
                showMiniCart();
            }, 50);
        });
    });
});

// Función global para abrir el carrito (respaldo)
window.openMiniCart = function() {
    ensureModalFooterExists();
    showMiniCart();
};

// Función para actualizar el mini carrito
function updateMiniCart(cartItems = []) {
  const miniCartContainer = document.getElementById('mini-cart-items');
  const totalElement = document.getElementById('mini-cart-total');
  const cartCountBadge = document.getElementById('cart-count');
  
  // Limpiar el contenedor
  miniCartContainer.innerHTML = '';
  
  // Asegurar que el contenedor tenga la clase para scroll
  miniCartContainer.classList.add('mini-cart-scrollable');
  
  // Si hay productos, mostrarlos
  if (cartItems.length > 0) {
    let html = '<ul class="list-unstyled">';
    let total = 0;
    
    cartItems.forEach(item => {
      const imageUrl = item.imagen ? item.imagen : '/img/no-image.png';
      total += parseFloat(item.subtotal);
      
      html += `
      <li class="mb-3">
        <div class="d-flex">
          <div class="mini-cart-img-container me-2">
            <img src="${imageUrl}" class="mini-cart-img" alt="${item.nombre}" 
                onerror="this.onerror=null; this.src='/img/no-image.png';">
          </div>
          <div class="mini-cart-product-row">
            <!-- Nombre del producto completo sin recortar -->
            <h6 class="mb-1 fs-6">${item.nombre}</h6>
            
            <!-- Fila inferior con precio y controles -->
            <div class="mini-cart-bottom-row">
              <div>
                <div class="text-muted small">$${formatPrice(item.precio)}/u</div>
                <div class="fw-bold small">$${formatPrice(item.subtotal)}</div>
              </div>
              
              <div class="d-flex align-items-center">
                <!-- Controles de cantidad -->
                <div class="d-flex align-items-center me-2">
                  <button class="btn btn-sm btn-outline-secondary mini-cart-decrease" data-id="${item.idProducto}">-</button>
                  <span class="mini-cart-quantity mx-2">${item.cantidad}</span>
                  <button class="btn btn-sm btn-outline-secondary mini-cart-increase" data-id="${item.idProducto}">+</button>
                </div>
                
                <!-- Botón eliminar alineado a la derecha -->
                <button class="btn btn-sm btn-outline-danger mini-cart-remove" data-id="${item.idProducto}">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </li>
    `;
    });
    
    html += '</ul>';
    miniCartContainer.innerHTML = html;
    
    // Actualizar el total y el contador
    totalElement.textContent = formatPrice(total);
    cartCountBadge.textContent = cartItems.length;
    cartCountBadge.style.display = 'inline-block';
  } else {
    // Carrito vacío
    miniCartContainer.innerHTML = '<div class="text-center py-4"><i class="bi bi-cart-x fs-1 text-muted"></i><p class="mt-2">Tu carrito está vacío</p></div>';
    totalElement.textContent = '0';
    cartCountBadge.textContent = '0';
    cartCountBadge.style.display = 'none';
  }
  
  // Actualizar eventos de los botones
  attachMiniCartEvents();
}
