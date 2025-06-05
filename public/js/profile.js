$(function() {
  // Verificar si el usuario está autenticado
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/';
    return;
  }

  // Cargar la navbar adecuada
  const role = localStorage.getItem('role');
  const partial = role === 'ROLE_ADMIN' ? 'navbar-admin' : 'navbar-user';
  $('#navbar-container').load(`/partials/${partial}`);

  // Cargar datos del perfil
  loadProfileData();
  // Eventos para edición de perfil
  $('#btn-edit-profile, #quick-edit-btn').on('click', showEditForm);
  $('#btn-cancel-edit').on('click', hideEditForm);
  $('#edit-profile-form').on('submit', saveProfileChanges);
  
  // Ir directamente a edición desde la alerta (para ambos botones)
  $(document).on('click', '#edit-profile-link, #edit-complete-profile-link', function(e) {
    e.preventDefault();
    showEditForm();
  });

  // Validación en tiempo real
  $('#edit-nombre, #edit-apellido, #edit-telefono, #edit-correo').on('input', validateField);
  $('#edit-password').on('input', validatePassword);

  // Función para cargar los datos del perfil
  function loadProfileData() {
    $.ajax({
      url: API_BASE_URL + '/auth/user-info',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      },      success: function(data) {
        // Mostrar datos en la vista
        $('#profile-cedula').text(data.cedula);
        $('#profile-nombre').text(data.cliNombre || '');
        $('#profile-apellido').text(data.cliApellido || '');
        $('#profile-telefono').text(data.cliTelefono || '');
        $('#profile-correo').text(data.cliCorreo || '');

        // Actualizar header del perfil
        updateProfileHeader(data);

        // Verificar si el perfil está completo
        const isProfileComplete = checkProfileComplete(data);
        
        // Mostrar u ocultar las alertas según corresponda
        $('#profile-incomplete').toggle(!isProfileComplete);
        $('#profile-complete').toggle(isProfileComplete);

        // Actualizar indicador de completitud
        updateCompletionIndicator(data);

        // Actualizar estadísticas del usuario
        updateUserStats(data);

        // Preparar datos para el formulario de edición
        $('#edit-cedula').val(data.cedula);
        $('#edit-nombre').val(data.cliNombre || '');
        $('#edit-apellido').val(data.cliApellido || '');
        $('#edit-telefono').val(data.cliTelefono || '');
        $('#edit-correo').val(data.cliCorreo || '');

        // Ocultar spinner y mostrar datos
        $('#loading-profile').hide();
        $('#profile-container').show();
      },
      error: function(xhr) {
        console.error('Error al cargar datos del perfil:', xhr);
        if (xhr.status === 401) {
          // Token expirado o inválido
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          alert('Su sesión ha expirado. Por favor inicie sesión nuevamente.');
          window.location.href = '/';
        } else {
          alert('Error al cargar los datos del perfil. Por favor intente nuevamente.');
        }
      }
    });
  }

  // Función para verificar si el perfil está completo
  function checkProfileComplete(data) {
    // Guardar estado del perfil en localStorage para usarlo en todas las páginas
    const isComplete = Boolean(data.cliNombre && data.cliApellido && data.cliTelefono && data.cliCorreo);
    localStorage.setItem('profileComplete', isComplete);
    return isComplete;
  }

  // Función para actualizar el header del perfil
  function updateProfileHeader(data) {
    const nombreCompleto = `${data.cliNombre || ''} ${data.cliApellido || ''}`.trim() || 'Usuario';
    $('#header-profile-name').text(nombreCompleto);
    $('#profile-nombre-completo').text(nombreCompleto);
    
    // Actualizar subtitle basado en el rol
    const role = localStorage.getItem('role');
    const subtitle = role === 'ROLE_ADMIN' ? 'Administrador del Sistema' : 'Usuario del Sistema';
    $('#header-profile-subtitle').text(subtitle);
  }

  // Función para actualizar el indicador de completitud
  function updateCompletionIndicator(data) {
    const fields = ['cedula', 'cliNombre', 'cliApellido', 'cliTelefono', 'cliCorreo'];
    const completedFields = fields.filter(field => data[field] && data[field].trim());
    const percentage = Math.round((completedFields.length / fields.length) * 100);
    
    $('#completion-progress').css('width', percentage + '%');
    $('#completion-percentage').text(percentage + '%');
    
    // Cambiar color según el porcentaje
    const progressBar = $('#completion-progress');
    if (percentage === 100) {
      progressBar.css('background', 'linear-gradient(90deg, #4CAF50, #66bb6a)');
    } else if (percentage >= 60) {
      progressBar.css('background', 'linear-gradient(90deg, #FF9800, #FFB74D)');
    } else {
      progressBar.css('background', 'linear-gradient(90deg, #F44336, #EF5350)');
    }
  }

  // Función para actualizar las estadísticas del usuario
  function updateUserStats(data) {
    // Actualizar año de registro (puedes ajustar esto según tu API)
    const currentYear = new Date().getFullYear();
    $('#member-since').text(currentYear);
    
    // Actualizar nivel basado en completitud del perfil
    const isComplete = checkProfileComplete(data);        $('#user-level').text(isComplete ? 'Completo' : 'Básico');
        
        // Cargar estadísticas del carrito solamente
        loadCartStats();
      }

      // Función para cargar estadísticas del carrito
      function loadCartStats() {
    $.ajax({
      url: API_BASE_URL + '/carrito',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      success: function(cart) {
        const itemCount = cart.items ? cart.items.length : 0;
        $('#cart-count').text(`${itemCount} productos`);
      },
      error: function() {
        $('#cart-count').text('Ver carrito');
      }
    });
  }

  // Función de validación en tiempo real
  function validateField() {
    const field = $(this);
    const value = field.val().trim();
    const fieldId = field.attr('id');
    const feedback = field.siblings('.validation-feedback');
    
    let isValid = true;
    let message = '';

    switch(fieldId) {
      case 'edit-nombre':
      case 'edit-apellido':
        if (value.length < 2) {
          isValid = false;
          message = 'Debe tener al menos 2 caracteres';
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value)) {
          isValid = false;
          message = 'Solo se permiten letras y espacios';
        }
        break;
      
      case 'edit-telefono':
        if (!/^\d{8,15}$/.test(value.replace(/\s/g, ''))) {
          isValid = false;
          message = 'Debe tener entre 8 y 15 dígitos';
        }
        break;
      
      case 'edit-correo':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          isValid = false;
          message = 'Formato de correo inválido';
        }
        break;
    }

    // Aplicar estilos de validación
    if (isValid) {
      field.css('border-color', '#4CAF50');
      feedback.removeClass('invalid').addClass('valid').text('✓ Válido');
    } else {
      field.css('border-color', '#F44336');
      feedback.removeClass('valid').addClass('invalid').text(message);
    }

    return isValid;
  }

  // Función para validar contraseña
  function validatePassword() {
    const field = $(this);
    const value = field.val();
    const feedback = field.siblings('.validation-feedback');
    
    if (value === '') {
      field.css('border-color', '#DEE2E6');
      feedback.removeClass('valid invalid').hide();
      return true;
    }

    let isValid = true;
    let message = '';

    if (value.length < 6) {
      isValid = false;
      message = 'La contraseña debe tener al menos 6 caracteres';
    }

    // Aplicar estilos de validación
    if (isValid) {
      field.css('border-color', '#4CAF50');
      feedback.removeClass('invalid').addClass('valid').text('✓ Contraseña válida');
    } else {
      field.css('border-color', '#F44336');
      feedback.removeClass('valid').addClass('invalid').text(message);
    }

    return isValid;
  }

  function showEditForm() {
    $('#profile-container').hide();
    $('#edit-profile-container').show();
    
    // Asegurarnos de que exista el campo de contraseña en el formulario
    if ($('#edit-password').length === 0) {
      $('#edit-profile-form .form-group:last').after(`
        <div class="form-group mb-3">
          <label for="edit-password">Nueva Contraseña (opcional):</label>
          <input type="password" class="form-control" id="edit-password" placeholder="Dejar en blanco para mantener la contraseña actual">
          <small class="form-text text-muted">Completa este campo solo si deseas cambiar tu contraseña actual.</small>
        </div>
      `);
    }
  }

  function hideEditForm() {
    $('#edit-profile-container').hide();
    $('#profile-container').show();
  }
  function saveProfileChanges(e) {
    e.preventDefault();

    // Validar todos los campos antes de enviar
    const fields = ['#edit-nombre', '#edit-apellido', '#edit-telefono', '#edit-correo'];
    let allValid = true;
    
    fields.forEach(field => {
      const $field = $(field);
      $field.trigger('input'); // Activar validación
      if ($field.siblings('.validation-feedback').hasClass('invalid')) {
        allValid = false;
      }
    });

    // Validar contraseña si tiene valor
    const $password = $('#edit-password');
    if ($password.val()) {
      $password.trigger('input');
      if ($password.siblings('.validation-feedback').hasClass('invalid')) {
        allValid = false;
      }
    }    if (!allValid) {
      if (typeof window.showGlobalToast === 'function') {
        window.showGlobalToast('error', 'Por favor corrige los errores en el formulario');
      } else {
        alert('Por favor corrige los errores en el formulario');
      }
      return;
    }

    // Cambiar estado del botón
    const $submitBtn = $('#btn-save-changes');
    const $btnText = $submitBtn.find('.btn-text');
    const $btnLoading = $submitBtn.find('.btn-loading');
    
    $submitBtn.prop('disabled', true);
    $btnText.hide();
    $btnLoading.show();

    // Usar los nombres de campos correctos según la API y los IDs del formulario
    const userData = {
      nombre: $('#edit-nombre').val().trim(),
      apellido: $('#edit-apellido').val().trim(),
      telefono: $('#edit-telefono').val().trim(),
      email: $('#edit-correo').val().trim() // La API espera "email", no "correo"
    };

    // Verificar si hay una nueva contraseña y añadirla SOLO si no está vacía
    const nuevaPassword = $('#edit-password').val().trim();
    if (nuevaPassword) {
      userData.nuevaPassword = nuevaPassword;
    }

    // Agregar logs de depuración
    console.log('============ DEPURACIÓN DE ACTUALIZACIÓN DE PERFIL ============');
    console.log('URL de la petición:', `${API_BASE_URL}/usuarios/actualizar-cliente`);
    console.log('Método HTTP:', 'PUT');
    console.log('Datos enviados:', userData);
    console.log('Datos en formato JSON:', JSON.stringify(userData, null, 2));
    console.log('Token de autorización presente:', !!token);
    console.log('=================================================================');
    
    $.ajax({
      url: API_BASE_URL + '/usuarios/actualizar-cliente', // URL correcta según documentación
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json', // Añadir header Content-Type
        'Authorization': 'Bearer ' + token
      },
      data: JSON.stringify(userData),
      success: function(response) {
        console.log('Respuesta del servidor:', response);
        
        // Restaurar botón
        $submitBtn.prop('disabled', false);
        $btnText.show();
        $btnLoading.hide();
        
        // Actualizar el estado del perfil inmediatamente
        loadProfileData();
        hideEditForm();
        
        // Mostrar modal de éxito en lugar de alert
        showProfileUpdateSuccess();
      },
      error: function(xhr) {
        console.error('Error al actualizar perfil:', xhr);
        
        // Restaurar botón
        $submitBtn.prop('disabled', false);
        $btnText.show();
        $btnLoading.hide();
        
        let mensaje = 'Error al actualizar el perfil';
        
        // Intentar obtener mensaje específico del error
        if (xhr.responseJSON && xhr.responseJSON.mensaje) {
          mensaje = xhr.responseJSON.mensaje;
        }
        
        if (typeof window.showGlobalToast === 'function') {
          window.showGlobalToast('error', mensaje + '. Por favor intente nuevamente.');
        } else {
          alert(mensaje + '. Por favor intente nuevamente.');
        }
      }
    });
  }

  // Event listener para el formulario de perfil
  $('#profile-form').on('submit', function(e) {
    e.preventDefault();
    
    // Obtener los datos del formulario
    const userData = {
      nombre: $('#nombre').val().trim(),
      apellido: $('#apellido').val().trim(),
      telefono: $('#telefono').val().trim(),
      email: $('#correo').val().trim()
    };
    
    // Si hay contraseña nueva y no está vacía, añadirla
    const nuevaPassword = $('#password').val();
    if (nuevaPassword) {
      userData.nuevaPassword = nuevaPassword;
    }
    
    // URL correcta según la documentación
    const updateUrl = `${window.API_BASE_URL}/usuarios/actualizar-cliente`;
    
    // Agregar logs de depuración
    console.log('============ DEPURACIÓN DE ACTUALIZACIÓN DE PERFIL ============');
    console.log('URL de la petición:', updateUrl);
    console.log('Método HTTP:', 'PUT');
    console.log('Datos enviados:', userData);
    console.log('Datos en formato JSON:', JSON.stringify(userData, null, 2));
    console.log('Token de autorización presente:', !!token);
    console.log('=================================================================');
    
    // Cambiar estado del botón
    const $submitBtn = $('#save-profile-btn');
    const originalText = $submitBtn.html();
    $submitBtn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Guardando...');
    
    // Hacer la petición al servidor
    $.ajax({
      url: updateUrl,
      type: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      data: JSON.stringify(userData),
      success: function(response) {
        console.log('Respuesta del servidor:', response);
        
        $submitBtn.prop('disabled', false).html(originalText);
        
        // Mostrar mensaje de éxito
        showToast('success', 'Perfil actualizado correctamente');
        
        // Limpiar campo de contraseña
        $('#password').val('');
        
        // Marcar el perfil como completo
        localStorage.setItem('profileComplete', 'true');
        
        // Verificar si hay redirección pendiente
        const redirect = sessionStorage.getItem('profileRedirect');
        if (redirect) {
          sessionStorage.removeItem('profileRedirect');
          window.location.href = redirect;
        }
      },
      error: function(xhr) {
        console.error('Error en la actualización del perfil:', xhr);
        
        $submitBtn.prop('disabled', false).html(originalText);
        
        let errorMsg = 'Error al actualizar el perfil';
        if (xhr.responseJSON && xhr.responseJSON.mensaje) {
          errorMsg = xhr.responseJSON.mensaje;
        }
        
        showToast('error', errorMsg);
      }
    });
  });

  // Reemplazar la funcionalidad que mostraba el modal con una notificación tipo toast
  function showProfileUpdateSuccess() {
    // Crear una notificación toast mejorada
    const toast = document.createElement('div');
    toast.className = 'position-fixed bottom-0 end-0 p-3';
    toast.style.zIndex = '5000';
    toast.innerHTML = `
      <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="toast-header bg-success text-white">
          <i class="bi bi-check-circle-fill me-2"></i>
          <strong class="me-auto">¡Actualización Exitosa!</strong>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">
          <p class="mb-2">Perfil actualizado correctamente</p>
          <div class="d-flex gap-2">
            <a href="/catalog" class="btn btn-sm btn-outline-success">
              <i class="bi bi-shop me-1"></i>Ir al catálogo
            </a>
            <a href="/cart" class="btn btn-sm btn-outline-success">
              <i class="bi bi-cart me-1"></i>Ver mi carrito
            </a>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Eliminar la notificación después de 5 segundos
    setTimeout(() => {
      toast.remove();
    }, 5000);
    
    // Recargar los datos del perfil
    loadProfileData();
    
    // Animar transición de vuelta a la vista de perfil
    $('#edit-profile-container').fadeOut(300, function() {
      $('#profile-container').fadeIn(300, function() {
        // Resaltar visualmente los campos actualizados
        highlightUpdatedFields();
      });
    });
    
    // Efecto de celebración con confeti (opcional)
    showConfetti();
  }
  
  // Función para resaltar brevemente los campos que se actualizaron
  function highlightUpdatedFields() {
    // Aplicar un efecto de resaltado a todos los campos del perfil
    $('.field-value').addClass('field-updated');
    
    // Quitar el efecto después de 2 segundos
    setTimeout(() => {
      $('.field-value').removeClass('field-updated');
    }, 2000);
  }
  
  // Función para mostrar un efecto de confeti
  function showConfetti() {
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

  // Aplicar estilos personalizados al botón de editar perfil
  const editProfileBtn = document.getElementById('edit-profile-btn');
  if (editProfileBtn) {
      editProfileBtn.style.borderRadius = '8px';
      editProfileBtn.style.padding = '12px 24px';
      editProfileBtn.style.fontWeight = '600';
      editProfileBtn.style.textTransform = 'uppercase';
      editProfileBtn.style.letterSpacing = '0.5px';
      editProfileBtn.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  }

  // Manejar el evento de edición de perfil
  if (editProfileBtn) {
      editProfileBtn.addEventListener('click', function() {
          document.getElementById('profile-view').style.display = 'none';
          document.getElementById('edit-profile-container').style.display = 'block';
      });
  }
});
