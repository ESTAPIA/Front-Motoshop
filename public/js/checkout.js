$(function() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/auth/login?redirect=/checkout';
    return;
  }

  let finalOrderId = null; // El ID del pedido que se va a pagar, se determinará según el flujo.
  let finalShouldClearCart = true; // Por defecto, para un nuevo checkout, el carrito se limpia.
  // Esta variable global se usa para mostrar el total en el paso 3 y para la lógica de saldo en renderBankAccountsUI
  // Se actualiza en loadCartSummary, fetchAndDisplayOrderForPayment, o createPendingOrderForNewCheckout.
  let currentOrderTotalForUI = 0; 

  const urlParams = new URLSearchParams(window.location.search);
  const orderIdFromUrl = urlParams.get('orderId');

  // Cargar la navbar siempre
  loadNavbar();

  if (orderIdFromUrl) {
    // FLUJO: Pagar un pedido existente que viene en la URL (ej. /checkout?orderId=123)
    console.log(`Checkout iniciado para pagar pedido existente ID: ${orderIdFromUrl} desde URL.`);
    finalOrderId = orderIdFromUrl;
    finalShouldClearCart = false; // No limpiar el carrito en este caso.

    // Adaptar la UI: Ocultar el paso 1 (dirección) y mostrar el paso 2 (pago).
    $('#checkout-step-1').addClass('d-none');
    $('#checkout-step-2').removeClass('d-none');
    $('#step-1').removeClass('active').addClass('completed'); // Marcar paso 1 como completado visualmente
    $('#step-2').addClass('active'); // Marcar paso 2 como activo

    // Cargar los detalles del pedido existente (total, dirección) y luego las cuentas bancarias.
    fetchAndDisplayOrderForPayment(finalOrderId);

  } else {
    // FLUJO: Checkout normal (el usuario viene desde su carrito para crear un nuevo pedido).
    console.log("Checkout iniciado para un nuevo pedido (desde el carrito). El carrito se limpiará.");
    finalShouldClearCart = true; // Asegurar que es true para el flujo normal.
    // finalOrderId se establecerá después de llamar a createPendingOrderForNewCheckout.
    
    // Cargar el resumen del carrito actual. Esto también establece currentOrderTotalForUI.
    loadCartSummary(); 
    // El HTML por defecto debe tener el paso 1 (dirección) visible y activo.
  }  // Event listener para el formulario de dirección (SOLO para checkout normal)
  $('#shipping-address-form').on('submit', function(e) {
    e.preventDefault();
    if (orderIdFromUrl) {
      // Este submit no debería ocurrir si orderIdFromUrl está presente,
      // ya que el paso 1 (dirección) debería estar oculto.
      console.warn("Formulario de dirección enviado, pero orderIdFromUrl existe. Esto no debería pasar.");
      return; 
    }

    const shippingAddress = $('#shipping-address').val().trim();
    if (!shippingAddress) {
      $('#address-error').text('Por favor ingrese una dirección de entrega').show();
      return;
    }
    $('#confirm-address').text(shippingAddress); // Para mostrar en el resumen del paso 3
    createPendingOrderForNewCheckout(shippingAddress); // Crea el pedido y luego carga las cuentas.
  });

  // Listener para el botón "Atrás" del paso 2 al paso 1
  $('#back-to-step-1').on('click', function() {
    if (orderIdFromUrl) {
        // Si estamos pagando un pedido existente desde URL, no deberíamos poder volver al paso 1 (dirección)
        // ya que ese pedido ya tiene una dirección.
        console.warn("Intento de volver al paso 1 mientras se paga un pedido existente desde URL. No permitido.");
        return; 
    }
    // Lógica normal para volver al paso 1
    $('#checkout-step-2').addClass('d-none');
    $('#checkout-step-1').removeClass('d-none');
    $('#step-2').removeClass('active');
    $('#step-1').removeClass('completed').addClass('active');
    window.scrollTo(0, 0);
  });
    // Al seleccionar una cuenta bancaria
  $(document).on('click', '.bank-account-option', function() {
    if ($(this).hasClass('account-insufficient-funds')) {
      showToast('error', 'Esta cuenta no tiene fondos suficientes para completar el pago');
      // Efecto visual de rechazo
      $(this).addClass('shake-animation');
      setTimeout(() => $(this).removeClass('shake-animation'), 500);
      return;
    }
    
    // Remover selección anterior
    $('.bank-account-option').removeClass('active');
    
    // Seleccionar nueva cuenta con efecto
    $(this).addClass('active');
    
    // Efecto de confirmación visual
    $(this).addClass('selection-confirmed');
    setTimeout(() => $(this).removeClass('selection-confirmed'), 300);
    
    selectedAccountId = $(this).data('account-id');
    selectedAccountType = $(this).data('tipo-cuenta');
    console.log("Cuenta seleccionada:", selectedAccountId, selectedAccountType);
    
    // Habilitar botón continuar
    $('#continue-to-step-3').prop('disabled', false);
    
    // Actualizar texto del botón
    $('#continue-to-step-3').html(`
      <i class="bi bi-check2 me-2"></i>Continuar con ${selectedAccountType}
      <i class="bi bi-arrow-right ms-2"></i>
    `);
    
    // Toast de confirmación
    showToast('success', `Cuenta ${selectedAccountType} seleccionada correctamente`);
  });
  // Listener para el botón "Continuar al Paso 3" (desde selección de cuenta a confirmación)
  $('#continue-to-step-3').on('click', function() {
    if (!selectedAccountId) {
      showToast('error', 'Por favor seleccione una cuenta bancaria');
      return;
    }
    
    // Agregar clase de procesamiento a las cards
    $('.confirmation-card').addClass('processing');
    
    $('#checkout-step-2').addClass('d-none');
    $('#checkout-step-3').removeClass('d-none');
    $('#step-2').removeClass('active').addClass('completed');
    $('#step-3').addClass('active');
    
    // Asegurar que #confirm-total y #confirm-address estén actualizados.
    // currentOrderTotalForUI se actualiza en loadCartSummary o fetchAndDisplayOrderForPayment o createPendingOrderForNewCheckout
    $('#confirm-total').text('$' + formatPrice(currentOrderTotalForUI)); 
    // $('#confirm-address') se actualiza en el submit de dirección o en fetchAndDisplayOrderForPayment
    
    // Actualizar información de cuenta con animación
    const accountText = `${selectedAccountType} (ID: ${selectedAccountId})`;
    $('#confirm-account').fadeOut(200, function() {
      $(this).text(accountText).fadeIn(300);
    });
    
    // Remover clase de procesamiento después de un momento
    setTimeout(() => {
      $('.confirmation-card').removeClass('processing');
    }, 1000);
    
    // Toast de confirmación
    showToast('success', 'Información de pago actualizada correctamente');
    
    window.scrollTo(0, 0);
  });

  // Listener para el botón "Atrás" del paso 3 al paso 2
  $('#back-to-step-2').on('click', function() {
    $('#checkout-step-3').addClass('d-none');
    $('#checkout-step-2').removeClass('d-none');
    $('#step-3').removeClass('active');
    $('#step-2').removeClass('completed').addClass('active');
    window.scrollTo(0, 0);
  });
  
  // Botón final de confirmación de pago
  $('#confirm-payment-btn').on('click', function() {
    if (!finalOrderId) {
      showToast('error', 'Error: No se ha identificado un pedido para pagar.');
      console.error("Error: finalOrderId es null al intentar confirmar el pago.");
      return;
    }
    if (!selectedAccountId) {
      showToast('error', 'Por favor seleccione una cuenta bancaria para el pago.');
      return;
    }
    console.log(`Click en Confirmar Pago. Pedido ID: ${finalOrderId}, Limpiar Carrito: ${finalShouldClearCart}`);
    callConfirmPaymentAPI(finalOrderId, selectedAccountId, selectedAccountType, finalShouldClearCart);
  });

  // --- FUNCIONES AUXILIARES ---

  function loadNavbar() {
    const role = localStorage.getItem('role');
    const partial = role === 'ROLE_ADMIN' ? 'navbar-admin' : 'navbar-user';
    $('#navbar-container').load(`/partials/${partial}`);
  }

  function loadCartSummary() { // Para checkout normal
    $.ajax({
      url: `${window.API_BASE_URL}/carrito`,
      type: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      success: function(data) {
        if (!data.items || data.items.length === 0) {
          window.location.href = '/cart'; // Redirigir si el carrito está vacío
          return;
        }
        currentOrderTotalForUI = data.total; // Actualizar el total para la UI
        $('#confirm-total').text('$' + formatPrice(currentOrderTotalForUI)); // Para el paso 3
        renderCartSummaryUI(data); // Renderiza el resumen del carrito en #order-summary
      },
      error: function(xhr) {
        // ... (manejo de error) ...
        showToast('error', 'Error al cargar el resumen del carrito');
      }
    });
  }  function renderCartSummaryUI(data) { // Muestra items del carrito en #order-summary
    let html = `
      <div class="order-items-container">
        <div class="items-header">
          <h6><i class="bi bi-bag-fill me-2"></i>Productos seleccionados</h6>
          <span class="items-count">${data.items.length} artículo${data.items.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="items-list">`;

    data.items.forEach(item => {
      // Obtener imagen del producto
      let imageUrl = '/img/no-image.png';
      
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
      } else if (item.imagen && typeof item.imagen === 'string' && item.imagen.trim() !== '') {
        imageUrl = item.imagen;
      }

      html += `
        <div class="order-item">
          <div class="order-item-image">
            <img src="${imageUrl}" alt="${item.nombre}" 
                 onerror="this.onerror=null; this.src='/img/no-image.png';">
          </div>
          <div class="order-item-details">
            <div class="item-name">${item.nombre}</div>
            <div class="item-meta">
              <span class="item-quantity">Cantidad: ${item.cantidad}</span>
              <span class="item-price">$${formatPrice(item.precio)} c/u</span>
            </div>
          </div>
          <div class="item-subtotal">
            $${formatPrice(item.subtotal)}
          </div>
        </div>`;
    });    html += `
        </div>
        <div class="order-total-section">
          <div class="total-breakdown">
            <div class="total-line subtotal-line">
              <span class="total-line-label">
                <i class="bi bi-calculator me-2"></i>Subtotal:
              </span>
              <span class="total-line-value">$${formatPrice(data.total)}</span>
            </div>
            <div class="total-line shipping-line">
              <span class="total-line-label">
                <i class="bi bi-truck me-2"></i>Envío:
              </span>
              <span class="total-line-value shipping-free">
                <i class="bi bi-gift-fill me-1"></i>Gratis
              </span>
            </div>
            <div class="total-line tax-line">
              <span class="total-line-label">
                <i class="bi bi-receipt me-2"></i>IVA incluido:
              </span>
              <span class="total-line-value tax-included">
                <i class="bi bi-check-circle-fill me-1"></i>Sí
              </span>
            </div>
          </div>
          <div class="final-total">
            <span class="total-label">
              <i class="bi bi-credit-card me-2"></i>Total a pagar:
            </span>
            <span class="total-value">$${formatPrice(data.total)}</span>
          </div>
        </div>
      </div>`;
    
    $('#order-summary').html(html);
  }
  
  function fetchAndDisplayOrderForPayment(pedidoId) { // Para pagar pedido existente desde URL
    console.log(`Obteniendo detalles del pedido ${pedidoId} para el proceso de pago.`);
    $('#payment-loading').show(); 
    $('#bank-accounts-container').hide();

    $.ajax({
      url: `${window.API_BASE_URL}/pedidos/${pedidoId}`, 
      type: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      success: function(pedido) {
        console.log("Detalles del pedido existente cargados para pago:", pedido);
        currentOrderTotalForUI = pedido.total; // Actualizar el total para la UI
        
        $('#confirm-total').text('$' + formatPrice(pedido.total)); // Para el paso 3
        $('#confirm-address').text(pedido.direccionEntrega || 'No especificada'); // Para el paso 3
        
        // Idealmente, aquí se debería mostrar un resumen de los items del PEDIDO EXISTENTE,
        // no del carrito actual. Se necesitaría una función como renderOrderItemsSummary(pedido.detalles).
        // Por ahora, #order-summary podría mostrar el carrito (si loadCartSummary se llamó) o estar vacío.
        // Para simplificar, no modificaremos #order-summary aquí, enfocándonos en la lógica de pago.
        // Si se desea, se puede añadir: renderOrderItemsSummary(pedido.detalles, '#order-summary');

        loadBankAccountsForOrder(pedido.total); // Cargar cuentas, pasando el total correcto del pedido
      },
      error: function(xhr) {
        console.error("Error al cargar detalles del pedido existente para pago:", xhr);
        showToast('error', 'Error al cargar la información del pedido a pagar.');
        $('#payment-loading').hide();
      }
    });
  }

  function createPendingOrderForNewCheckout(direccion) { // Para checkout normal
    const $btn = $('#address-submit-btn');
    const originalBtnText = $btn.html();
    $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Procesando...');
    
    $.ajax({
      url: `${window.API_BASE_URL}/proceso-pago/crear-pedido-pendiente`,
      type: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: JSON.stringify({ direccionEntrega: direccion }),
      success: function(data) {
        console.log("Nuevo pedido pendiente creado para checkout:", data);
        $btn.prop('disabled', false).html(originalBtnText);
        finalOrderId = data.idPedido; // Establecer el ID del pedido que se pagará
        currentOrderTotalForUI = data.total; // Actualizar el total para la UI
        $('#confirm-total').text('$' + formatPrice(currentOrderTotalForUI)); // Para el paso 3
        
        // Transición UI al paso 2 (selección de cuenta)
        $('#checkout-step-1').addClass('d-none');
        $('#checkout-step-2').removeClass('d-none');
        $('#step-1').removeClass('active').addClass('completed');
        $('#step-2').addClass('active');
        
        loadBankAccountsForOrder(data.total); // Cargar cuentas, pasando el total del nuevo pedido
        window.scrollTo(0, 0);
      },
      error: function(xhr) {
        $btn.prop('disabled', false).html(originalBtnText);
        // ... (manejo de error) ...
        showToast('error', 'Error al crear el pedido pendiente.');
      }
    });
  }

  function loadBankAccountsForOrder(orderTotalForBalanceCheck) {
    if (!finalOrderId) {
      console.error("loadBankAccountsForOrder llamado sin finalOrderId establecido.");
      showToast('error', 'Error interno: ID de pedido no disponible para cargar cuentas.');
      return;
    }
    console.log(`Cargando cuentas bancarias para pedido ID: ${finalOrderId}. Total para chequeo de saldo en UI: ${orderTotalForBalanceCheck}`);
    $('#payment-loading').show();
    $('#bank-accounts-container').hide();
    $('#no-bank-accounts-message').hide();

    $.ajax({
      url: `${window.API_BASE_URL}/proceso-pago/verificar-cuentas/${finalOrderId}`,
      type: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      success: function(data) {
        $('#payment-loading').hide();
        $('#bank-accounts-container').show();
        if (data.tieneCuentas) {
            renderBankAccountsUI(data.cuentasConSaldo, data.cuentasSinSaldo, orderTotalForBalanceCheck);
        } else {
            $('#no-bank-accounts-message').show();
            showToast('error', 'No tienes cuentas bancarias disponibles');
        }
      },
      error: function(xhr) {
        $('#payment-loading').hide();
        $('#payment-error-message').show().text('Error al cargar las cuentas bancarias.');
        console.error("Error al verificar cuentas:", xhr);
        showToast('error', 'Error al cargar las cuentas bancarias');
      }
    });
  }
  function renderBankAccountsUI(accountsWithBalance, accountsWithoutBalance, currentOrderTotalValue) {
    const $container = $('#bank-accounts-list');
    $container.empty();
    let hasAnySufficientFundsAccount = false;

    if (accountsWithBalance && accountsWithBalance.length > 0) {
      accountsWithBalance.forEach(account => {
        hasAnySufficientFundsAccount = true;
        $container.append(`
          <div class="bank-account-option" 
                  data-account-id="${account.cuentaId}" data-tipo-cuenta="${account.tipoCuenta}">
            <div class="selection-indicator"></div>
            <div class="bank-account-header">
              <div class="bank-account-type">${account.tipoCuenta}</div>
            </div>
            <div class="bank-account-number">
              <i class="bi bi-credit-card me-2"></i>ID: ${account.cuentaId}
            </div>
            <div class="bank-account-balance">
              <span class="balance-label">Saldo disponible:</span>
              <span class="balance-amount">$${formatPrice(account.saldo)}</span>
            </div>
          </div>`);
      });
    }

    if (accountsWithoutBalance && accountsWithoutBalance.length > 0) {
      accountsWithoutBalance.forEach(account => {
        $container.append(`
          <div class="bank-account-option account-insufficient-funds" 
                  data-account-id="${account.cuentaId}" data-tipo-cuenta="${account.tipoCuenta}">
            <div class="selection-indicator"></div>
            <div class="bank-account-header">
              <div class="bank-account-type">${account.tipoCuenta}</div>
            </div>
            <div class="bank-account-number">
              <i class="bi bi-credit-card me-2"></i>ID: ${account.cuentaId}
            </div>
            <div class="bank-account-balance">
              <span class="balance-label">Saldo disponible:</span>
              <span class="balance-amount balance-insufficient">$${formatPrice(account.saldo)}</span>
            </div>
            <div class="mt-2">
              <small class="text-danger">
                <i class="bi bi-exclamation-triangle me-1"></i>
                Saldo insuficiente (necesitas $${formatPrice(currentOrderTotalValue)})
              </small>
            </div>
          </div>`);
      });
    }
    
    // Agregar nota de seguridad
    if (hasAnySufficientFundsAccount) {
      $container.after(`
        <div class="security-note">
          <i class="bi bi-shield-check"></i>
          <p>El pago se procesará de forma segura desde la cuenta seleccionada</p>
        </div>
      `);
    }
    
    if (!hasAnySufficientFundsAccount && accountsWithBalance.length === 0 && accountsWithoutBalance.length > 0) {
        // Solo hay cuentas, pero ninguna con saldo suficiente
         $container.append(`
           <div class="alert alert-warning modern-alert mt-3">
             <div class="d-flex align-items-center">
               <i class="bi bi-exclamation-triangle-fill me-3 fs-4"></i>
               <div>
                 <strong>Fondos insuficientes</strong>
                 <p class="mb-0">Ninguna cuenta tiene saldo suficiente. Total requerido: $${formatPrice(currentOrderTotalValue)}</p>
               </div>
             </div>
           </div>
         `);
         $('#continue-to-step-3').prop('disabled', true);
    } else if (accountsWithBalance.length === 0 && accountsWithoutBalance.length === 0) {
        // No hay ninguna cuenta
        $('#no-bank-accounts-message').show();
        $('#continue-to-step-3').prop('disabled', true);
    } else {
        $('#continue-to-step-3').prop('disabled', true); // Deshabilitar hasta que se seleccione una cuenta
    }
  }
  function callConfirmPaymentAPI(pedidoId, ctaId, ctaTipo, clearCartFlag) {
    const $btn = $('#confirm-payment-btn');
    const originalBtnText = $btn.html();
    
    // Efecto visual de carga con animación
    $btn.prop('disabled', true).html(`
      <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      Procesando pago...
      <i class="bi bi-lock-fill ms-2"></i>
    `).addClass('btn-loading');
    
    // Mostrar toast de proceso iniciado
    showToast('info', 'Iniciando proceso de pago seguro...');
    
    const params = new URLSearchParams({
        cuentaId: ctaId,
        tipoCuenta: ctaTipo,
        clearCart: clearCartFlag
    });
    
    console.log(`API Call: /proceso-pago/confirmar-pago/${pedidoId}?${params.toString()}`);
    
    $.ajax({
      url: `${window.API_BASE_URL}/proceso-pago/confirmar-pago/${pedidoId}?${params.toString()}`,
      type: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      success: function(response) {
        // Efecto de éxito
        $btn.removeClass('btn-loading').addClass('btn-success-animation');
        $btn.html(`
          <i class="bi bi-check-circle-fill me-2"></i>
          ¡Pago Exitoso!
          <i class="bi bi-check2 ms-2"></i>
        `);
        
        console.log('Respuesta del servidor al confirmar pago:', response);
        
        // Mostrar modal de confirmación después de un breve momento
        setTimeout(() => {
          $btn.prop('disabled', false).html(originalBtnText).removeClass('btn-success-animation');
          showOrderConfirmation(pedidoId, currentOrderTotalForUI);
          if (typeof updateCartCounter === 'function') {
            updateCartCounter(); 
          }
        }, 1500);
      },
      error: function(xhr) {
        // Efecto de error
        $btn.removeClass('btn-loading').addClass('btn-error-animation');
        $btn.html(`
          <i class="bi bi-x-circle-fill me-2"></i>
          Error en el pago
          <i class="bi bi-exclamation-triangle ms-2"></i>
        `);
        
        let errorMsg = 'Error al procesar el pago';
        if (xhr.responseJSON && xhr.responseJSON.error) {
          errorMsg = xhr.responseJSON.error;
        }
        
        // Restaurar botón después del error
        setTimeout(() => {
          $btn.prop('disabled', false).html(originalBtnText).removeClass('btn-error-animation');
        }, 2000);
        
        showToast('error', errorMsg);
        console.error('Error al confirmar el pago:', xhr);
      }
    });
  }
  function showOrderConfirmation(orderId, total) {
    const modalHtml = `
      <div class="modal fade" id="order-success-modal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content order-success-content">
            <div class="modal-header success-header">
              <div class="success-icon-container">
                <i class="bi bi-check-circle-fill success-icon"></i>
              </div>
              <div class="success-text">
                <h4 class="modal-title">¡Pedido Confirmado Exitosamente!</h4>
                <p class="success-subtitle">Tu compra ha sido procesada correctamente</p>
              </div>
            </div>
            <div class="modal-body success-body">
              <div class="order-success-details">
                <div class="order-info-card">
                  <div class="order-number-section">
                    <div class="order-label">Número de Pedido</div>
                    <div class="order-number">#${orderId}</div>
                  </div>
                  <div class="order-amount-section">
                    <div class="amount-label">Total Pagado</div>
                    <div class="amount-value">$${formatPrice(total)}</div>
                  </div>
                </div>
                
                <div class="success-message">
                  <div class="message-icon">
                    <i class="bi bi-bag-check-fill"></i>
                  </div>
                  <div class="message-content">
                    <h5>¡Gracias por tu compra!</h5>
                    <p>Hemos recibido tu pedido y pronto comenzaremos a prepararlo. Recibirás un email de confirmación con todos los detalles.</p>
                  </div>
                </div>
                
                <div class="next-steps">
                  <h6><i class="bi bi-clock-history me-2"></i>¿Qué sigue?</h6>
                  <div class="steps-list">
                    <div class="step-item">
                      <div class="step-icon">
                        <i class="bi bi-envelope-check"></i>
                      </div>
                      <div class="step-text">
                        <strong>Email de confirmación</strong>
                        <span>Recibirás los detalles en tu correo</span>
                      </div>
                    </div>
                    <div class="step-item">
                      <div class="step-icon">
                        <i class="bi bi-box-seam"></i>
                      </div>
                      <div class="step-text">
                        <strong>Preparación del pedido</strong>
                        <span>Empezamos a preparar tu orden</span>
                      </div>
                    </div>
                    <div class="step-item">
                      <div class="step-icon">
                        <i class="bi bi-truck"></i>
                      </div>
                      <div class="step-text">
                        <strong>Envío en 2-3 días hábiles</strong>
                        <span>Tu pedido llegará pronto</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>            <div class="modal-footer success-footer">
              <div class="footer-actions">
                <button type="button" class="btn btn-success btn-modern btn-action" id="view-invoice-btn" data-order-id="${orderId}">
                  <i class="bi bi-receipt me-2"></i>Ver mi factura
                </button>
                <a href="/orders" class="btn btn-primary btn-modern btn-action">
                  <i class="bi bi-list-check me-2"></i>Ver Mis Pedidos
                </a>
                <a href="/catalog" class="btn btn-outline-secondary btn-modern btn-action">
                  <i class="bi bi-shop me-2"></i>Seguir Comprando
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    
    $('body').append(modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('order-success-modal'));
    modal.show();
    
    // Animación de entrada para el ícono
    setTimeout(() => {
      $('.success-icon').addClass('animate-success');
    }, 300);
      $('#order-success-modal').on('hidden.bs.modal', function() {
      $(this).remove(); // Limpiar el modal del DOM
      window.location.href = '/orders';
    });
      // Event listener para el botón "Ver mi factura"
    $(document).on('click', '#view-invoice-btn', function() {
      const orderIdForInvoice = $(this).data('order-id');
      showInvoiceModal(orderIdForInvoice);
    });
  }
  
  // Funciones para manejar la visualización de facturas
  function showInvoiceModal(orderId) {
    // Crear el modal de factura
    createInvoiceModal();
    
    // Mostrar el modal con spinner de carga
    const invoiceModal = new bootstrap.Modal(document.getElementById('invoice-detail-modal'));
    invoiceModal.show();
    
    // Cargar los detalles del pedido para la factura
    loadInvoiceDetails(orderId);
  }
  
  function createInvoiceModal() {
    // Eliminar modal previo si existe
    $('#invoice-detail-modal').remove();
    
    const modalHtml = `
      <div class="modal fade" id="invoice-detail-modal" tabindex="-1" aria-labelledby="invoiceDetailModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title" id="invoiceDetailModalLabel">Factura del Pedido</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="text-center py-5" id="invoice-loading">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-3">Cargando detalles de la factura...</p>
              </div>
              <div id="invoice-content" class="d-none"></div>
            </div>
            <div class="modal-footer">

              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    $('body').append(modalHtml);
  }
  
  function loadInvoiceDetails(orderId) {
    $.ajax({
      url: `${window.API_BASE_URL}/pedidos/${orderId}`,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(orderDetails) {
        updateInvoiceModalContent(orderDetails);
      },
      error: function(xhr) {
        $('#invoice-detail-modal').modal('hide');
        showGlobalToast('error', 'Error al cargar los detalles de la factura: ' + (xhr.responseJSON?.mensaje || xhr.statusText));
      }
    });
  }
  
  function updateInvoiceModalContent(order) {
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
    const invoiceHtml = `
      <div class="invoice-header text-center mb-4">
        <h3>FACTURA DE COMPRA</h3>
        <hr>
      </div>
      
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
    $('#invoice-loading').hide();
    $('#invoice-content').html(invoiceHtml).removeClass('d-none');
    $('#invoiceDetailModalLabel').text(`Factura del Pedido #${order.idPedido}`);
    
    // Agregar evento para imprimir
    $('#print-invoice-btn').off('click').on('click', function() {
      printInvoice(order);
    });
  }
  
  function getStatusBadgeClass(status) {
    switch (status) {
      case 'Pendiente':
        return 'bg-warning text-dark';
      case 'Confirmado':
        return 'bg-success';
      case 'Entregado':
        return 'bg-primary';
      case 'Cancelado':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }
  
  function printInvoice(order) {
    // Crear contenido para imprimir
    const fecha = new Date(order.fecha);
    const fechaFormateada = fecha.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let productosHtml = '';
    if (order.detalles && order.detalles.length > 0) {
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
        
        productosHtml += `
          <tr>
            <td>${nombreProducto}</td>
            <td style="text-align: center;">${cantidad}</td>
            <td style="text-align: right;">$${formatPrice(precioUnitario)}</td>
            <td style="text-align: right;">$${formatPrice(total)}</td>
          </tr>
        `;
      });
    }
    
    const printContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1>FACTURA DE COMPRA</h1>
          <hr>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div>
            <h3>Información del Pedido</h3>
            <p><strong>Pedido #:</strong> ${order.idPedido}</p>
            <p><strong>Fecha:</strong> ${fechaFormateada}</p>
            <p><strong>Estado:</strong> ${order.estado}</p>
            <p><strong>Cliente:</strong> ${order.cliCedula}</p>
          </div>
          <div>
            <h3>Información de Entrega</h3>
            <p><strong>Dirección:</strong> ${order.direccionEntrega || 'No especificada'}</p>
            <p><strong>Método de Pago:</strong> ${order.metodoPago || 'No especificado'}</p>
          </div>
        </div>
        
        <h3>Productos</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Producto</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Cantidad</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Precio Unitario</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${productosHtml}
          </tbody>
          <tfoot>
            <tr style="background-color: #f8f9fa; font-weight: bold;">
              <td colspan="3" style="border: 1px solid #ddd; padding: 12px; text-align: right;">Total:</td>
              <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">$${formatPrice(order.total)}</td>
            </tr>
          </tfoot>
        </table>
        
        <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #666;">
          <p>Gracias por su compra</p>
          <p>Para cualquier consulta, póngase en contacto con nuestro servicio al cliente</p>
        </div>
      </div>
    `;
    
    const printStyles = `
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    `;
    
    // Guardar contenido original
    const originalContent = document.body.innerHTML;
    
    // Cambiar contenido, imprimir y restaurar
    document.body.innerHTML = printStyles + printContent;
    window.print();
    document.body.innerHTML = originalContent;
    
    // Recargar la página después de imprimir para restaurar todo correctamente
    location.reload();
  }
  
  function formatPrice(price) {
    if (price === undefined || price === null) return '0.00';
    return parseFloat(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }

  function showToast(type, message) {
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
      <div class="toast align-items-center text-bg-${type} border-0" id="${toastId}" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">${message}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>`;
    const toastContainer = $('#toast-container');
    if (!toastContainer.length) {
      $('body').append('<div class="toast-container position-fixed bottom-0 end-0 p-3" id="toast-container"></div>');
    }
    $('#toast-container').append(toastHtml);
    const toastElement = new bootstrap.Toast(document.getElementById(toastId));
    toastElement.show();
    $('#' + toastId).on('hidden.bs.toast', function () { $(this).remove(); });
  }

  // Variables globales para la selección de cuenta (usadas por los listeners de eventos)
  let selectedAccountId = null;
  let selectedAccountType = null;
  // Validación en tiempo real para el paso 1 (solo dirección)
  function setupStep1Validation() {
    // Validación de dirección
    $('#shipping-address').on('input', function() {
      const address = $(this).val().trim();
      const isValid = address.length >= 10;
      $(this).toggleClass('is-valid', isValid);
      $(this).toggleClass('is-invalid', address.length > 0 && !isValid);
      
      // Actualizar contador de caracteres
      const charCount = address.length;
      let countText = `${charCount} caracteres`;
      if (charCount < 10) {
        countText += ` (mínimo 10)`;
      }
      
      if (!$('.char-counter').length) {
        $(this).after(`<small class="char-counter text-muted"></small>`);
      }
      $('.char-counter').text(countText);
    });
    
    // Efecto visual mejorado para botón submit
    $('#address-submit-btn').on('mouseenter', function() {
      if (!$(this).prop('disabled')) {
        $(this).addClass('btn-hover-effect');
      }
    }).on('mouseleave', function() {
      $(this).removeClass('btn-hover-effect');
    });
  }
  
  // Llamar a la configuración de validación
  setupStep1Validation();
});
