$(function(){
  const token = localStorage.getItem('token');
  const role  = localStorage.getItem('role');

  // Cargar navbar correspondiente con prefijo '/partials'
  const partial = token
    ? (role === 'ROLE_ADMIN' ? 'navbar-admin' : 'navbar-user')
    : 'navbar-guest';

  $('#navbar-container').load(`/partials/${partial}`);

  // Si ya hay token, ocultar el modal de autenticación
  if (token) $('#authModal').modal('hide');

  // SOLUCIÓN: Verificar si hay token y ocultar el botón "Comenzar Aventura" inmediatamente
  if (token) {
    // Usuario autenticado: ocultar botón "Comenzar Aventura"
    const adventureButton = document.querySelector('.hero-buttons .btn-primary');
    if (adventureButton) {
      adventureButton.style.display = 'none';
      console.log("Botón 'Comenzar Aventura' ocultado porque el usuario ya inició sesión");
    }
    
    // Hacer que el botón de catálogo ocupe todo el ancho
    const catalogButton = document.querySelector('.hero-buttons .btn-outline-light');
    if (catalogButton) {
      catalogButton.classList.add('w-100');
    }
    
    // Se ha eliminado la sección de "Mostrar acceso rápido"
  } else {
    console.log("No hay token, mostrando botón 'Comenzar Aventura'");
  }

  // Para asegurar que el botón se oculta incluso si la carga es lenta
  $(document).ready(function() {
    if (token) {
      $('.hero-buttons .btn-primary').hide();
      $('.hero-buttons .btn-outline-light').addClass('w-100');
    }
  });

  // ========================================
  // 🔒 SISTEMA DE VALIDACIÓN PROFESIONAL
  // ========================================

  // Validador de cédula ecuatoriana (10 dígitos numéricos)
  function validateCedula(cedula) {
    const cedulaRegex = /^\d{10}$/;
    return {
      isValid: cedulaRegex.test(cedula),
      message: cedulaRegex.test(cedula) ? '✓ Cédula válida' : 'La cédula debe tener exactamente 10 dígitos numéricos'
    };
  }

  // Validador de contraseña segura
  function validatePassword(password) {
    const minLength = password.length >= 6;
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    
    const isValid = minLength && hasNumber && hasLetter;
    let message = '';
    
    if (isValid) {
      message = '✓ Contraseña segura';
    } else if (!minLength) {
      message = 'La contraseña debe tener al menos 6 caracteres';
    } else if (!hasNumber) {
      message = 'La contraseña debe incluir al menos un número';
    } else if (!hasLetter) {
      message = 'La contraseña debe incluir al menos una letra';
    }
    
    return { isValid, message };
  }

  // Validador de confirmación de contraseña
  function validatePasswordConfirmation(password, confirmation) {
    const isValid = password === confirmation && password.length > 0;
    return {
      isValid,
      message: isValid ? '✓ Las contraseñas coinciden' : 'Las contraseñas no coinciden'
    };
  }

  // Función para mostrar feedback visual
  function showFieldFeedback(fieldId, validation) {
    const $field = $(`#${fieldId}`);
    const $feedbackContainer = $field.siblings('.field-feedback');
    
    // Remover clases existentes
    $field.removeClass('is-valid is-invalid');
    
    // Agregar clase apropiada
    $field.addClass(validation.isValid ? 'is-valid' : 'is-invalid');
    
    // Crear o actualizar el contenedor de feedback
    if ($feedbackContainer.length === 0) {
      $field.after(`<div class="field-feedback"></div>`);
    }
    
    const $feedback = $field.siblings('.field-feedback');
    $feedback.html(`
      <small class="${validation.isValid ? 'text-success' : 'text-danger'} fw-bold">
        <i class="bi bi-${validation.isValid ? 'check-circle-fill' : 'exclamation-triangle-fill'} me-1"></i>
        ${validation.message}
      </small>
    `);
  }

  // Función para limpiar feedback
  function clearFieldFeedback(fieldId) {
    const $field = $(`#${fieldId}`);
    $field.removeClass('is-valid is-invalid');
    $field.siblings('.field-feedback').remove();
  }

  // Solo permitir números en el campo cédula
  $('#cedula, #newCedula').on('input', function() {
    // Remover cualquier carácter que no sea número
    let value = $(this).val().replace(/[^\d]/g, '');
    
    // Limitar a 10 dígitos
    if (value.length > 10) {
      value = value.substring(0, 10);
    }
    
    $(this).val(value);
    
    // Validar solo si hay contenido
    if (value.length > 0) {
      const validation = validateCedula(value);
      showFieldFeedback($(this).attr('id'), validation);
    } else {
      clearFieldFeedback($(this).attr('id'));
    }
  });

  // Validación en tiempo real para contraseña del registro
  $('#newPassword').on('input', function() {
    const password = $(this).val();
    if (password.length > 0) {
      const validation = validatePassword(password);
      showFieldFeedback('newPassword', validation);
      
      // Si hay contenido en confirmación, revalidar también
      const confirmation = $('#confirmPassword').val();
      if (confirmation.length > 0) {
        const confirmValidation = validatePasswordConfirmation(password, confirmation);
        showFieldFeedback('confirmPassword', confirmValidation);
      }
    } else {
      clearFieldFeedback('newPassword');
      clearFieldFeedback('confirmPassword');
    }
  });

  // Validación en tiempo real para confirmación de contraseña
  $('#confirmPassword').on('input', function() {
    const password = $('#newPassword').val();
    const confirmation = $(this).val();
    
    if (confirmation.length > 0) {
      const validation = validatePasswordConfirmation(password, confirmation);
      showFieldFeedback('confirmPassword', validation);
    } else {
      clearFieldFeedback('confirmPassword');
    }
  });

  // Validación para contraseña de login (básica)
  $('#password').on('input', function() {
    const password = $(this).val();
    if (password.length > 0 && password.length < 6) {
      showFieldFeedback('password', {
        isValid: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    } else if (password.length >= 6) {
      showFieldFeedback('password', {
        isValid: true,
        message: '✓ Contraseña válida'
      });
    } else {
      clearFieldFeedback('password');
    }
  });

  // Función para validar formulario completo
  function validateRegistrationForm() {
    const cedula = $('#newCedula').val();
    const password = $('#newPassword').val();
    const confirmation = $('#confirmPassword').val();

    const cedulaValidation = validateCedula(cedula);
    const passwordValidation = validatePassword(password);
    const confirmValidation = validatePasswordConfirmation(password, confirmation);

    // Mostrar feedback para todos los campos
    showFieldFeedback('newCedula', cedulaValidation);
    showFieldFeedback('newPassword', passwordValidation);
    showFieldFeedback('confirmPassword', confirmValidation);

    return cedulaValidation.isValid && passwordValidation.isValid && confirmValidation.isValid;
  }

  // Función para validar formulario de login
  function validateLoginForm() {
    const cedula = $('#cedula').val();
    const password = $('#password').val();

    const cedulaValidation = validateCedula(cedula);
    const passwordValid = password.length >= 6;

    showFieldFeedback('cedula', cedulaValidation);
    
    if (!passwordValid && password.length > 0) {
      showFieldFeedback('password', {
        isValid: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    return cedulaValidation.isValid && passwordValid;
  }

  // Función de login
  function loginUser(cedula, password) {
    const payload = {
      cedula: cedula,
      password: password
    };
    
    return $.ajax({
      url: API_BASE_URL + '/auth/login',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload)
    });
  }
  // Login AJAX
  $('#loginForm').on('submit', function(e){
    e.preventDefault();
    
    // Validar formulario antes de enviar
    if (!validateLoginForm()) {
      return; // No enviar si hay errores
    }
    
    const cedula = $('#cedula').val();
    const password = $('#password').val();
    
    // Deshabilitar botón y mostrar loading
    const $submitBtn = $(this).find('button[type="submit"]');
    const originalText = $submitBtn.html();
    $submitBtn.prop('disabled', true).addClass('loading').html(
      '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Verificando...'
    );
    
    const payload = {
      cedula: cedula,
      password: password
    };

    $.ajax({
      url: API_BASE_URL + '/auth/login',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      success(res){
        // Guardar token, rol y cédula para referencia
        localStorage.setItem('token', res.token);
        localStorage.setItem('role', res.role);
        localStorage.setItem('cedula', cedula); // Guardar la cédula
        
        // Redireccionar según el rol
        if (res.role === 'ROLE_ADMIN') {
          window.location.href = '/'; // Puedes crear una dashboard de admin
        } else {
          window.location.href = '/profile'; // Ir al perfil como primer paso
        }      },
      error(xhr){
        // Obtener mensaje específico del error si está disponible
        let errorMsg = 'Credenciales inválidas';
        
        if (xhr.responseJSON && xhr.responseJSON.mensaje) {
          errorMsg = xhr.responseJSON.mensaje;
        } else if (xhr.status === 401) {
          errorMsg = 'Cédula o contraseña incorrecta';
        } else if (xhr.status === 403) {
          errorMsg = 'Acceso denegado';
        } else if (xhr.status >= 500) {
          errorMsg = 'Error del servidor. Intente nuevamente más tarde';
        }
        
        // Mostrar modal profesional en lugar de alert
        showLoginErrorModal(errorMsg);
        
        // Restaurar botón
        $submitBtn.prop('disabled', false).removeClass('loading').html(originalText);
      }
    });
  });

  // Registro AJAX - Con manejo de éxito y error
  $('#registerForm').on('submit', function(e){
    e.preventDefault();
    
    // Validar formulario completo antes de enviar
    if (!validateRegistrationForm()) {
      // Mostrar mensaje de error general
      showErrorModal('Por favor corrige los errores en el formulario antes de continuar');
      return;
    }
    
    const cedula = $('#newCedula').val();
    const password = $('#newPassword').val();
    
    // Deshabilitar botón y mostrar loading
    const $submitBtn = $(this).find('button[type="submit"]');
    const originalText = $submitBtn.html();
    $submitBtn.prop('disabled', true).addClass('loading').html(
      '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Registrando...'
    );
    
    const payload = {
      cedula: cedula,
      password: password
    };      // Configuración personalizada para evitar la alerta global
    $.ajax({
      url: API_BASE_URL + "/usuarios/registro",
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      global: false, // Esto evita que se disparen los eventos globales ajaxError
      success(res){
        // Ocultar modal de autenticación
        $('#authModal').modal('hide');
        
        // Verificar el estado de la respuesta
        if(res.estado === "exitoso") {
          // Caso de éxito
          // Mostrar el mensaje devuelto por el servidor
          $('#success-message').text(res.mensaje || 'Usuario registrado correctamente');
          
          // Mostrar modal de éxito
          $('#successModal').modal('show');
          
          // Iniciar sesión automáticamente después de un corto retraso
          setTimeout(function() {
            loginUser(cedula, password)
              .done(function(loginRes) {
                localStorage.setItem('token', loginRes.token);
                localStorage.setItem('role', loginRes.role);
                location.reload();
              })
              .fail(function() {
                // Si falla el inicio automático, cerrar modal y mostrar mensaje
                $('#successModal').modal('hide');
                showErrorModal('Registro exitoso, pero hubo un problema al iniciar sesión automáticamente. Por favor intente iniciar sesión manualmente.');
                setTimeout(function() {
                  $('#authModal').modal('show');
                  $('#login-tab').tab('show');
                  // Prellenar el formulario de login
                  $('#cedula').val(cedula);
                }, 1500);
              });
          }, 2000); // Esperar 2 segundos antes de iniciar sesión automáticamente
        } else {
          // Caso de error devuelto como respuesta exitosa
          showErrorModal(res.mensaje || 'Error en el registro');
          // Restaurar botón
          $submitBtn.prop('disabled', false).removeClass('loading').html(originalText);
        }
      },
      error(xhr){ 
        // Error en la petición HTTP
        let errorMsg = 'Error al procesar el registro';
        
        if (xhr.responseJSON && xhr.responseJSON.mensaje) {
          errorMsg = xhr.responseJSON.mensaje;
        } else if (xhr.status === 409) {
          errorMsg = 'Esta cédula ya está registrada';
        }
        
        showErrorModal(errorMsg);
        // Restaurar botón
        $submitBtn.prop('disabled', false).removeClass('loading').html(originalText);
      }
    });
  });
    // Función para mostrar modal de error
  function showErrorModal(message) {
    $('#error-message').text(message);
    $('#errorModal').modal('show');
  }

  // Función para mostrar modal de error de login
  function showLoginErrorModal(message) {
    $('#login-error-message').text(message);
    $('#loginErrorModal').modal('show');
  }

  // ========================================
  // 🔐 MANEJO DEL MODAL DE ERROR DE LOGIN
  // ========================================

  // Manejar el botón de recuperación de contraseña
  $(document).on('click', '#recover-password-btn', function() {
    // Cerrar el modal de error de login
    $('#loginErrorModal').modal('hide');
    
    // Mostrar un mensaje informativo (puedes personalizar esto según tu sistema)
    setTimeout(function() {
      alert('Para recuperar tu contraseña, contacta al administrador del sistema.');
      // Opcional: reabrir el modal de autenticación
      $('#authModal').modal('show');
    }, 300);
  });

  // Cuando se cierre el modal de error de login, reabrir el modal de autenticación
  $('#loginErrorModal').on('hidden.bs.modal', function () {
    // Solo reabrir si no se está redirigiendo o si el modal de auth no está ya abierto
    if (!$('#authModal').hasClass('show')) {
      setTimeout(function() {
        $('#authModal').modal('show');
      }, 200);
    }
  });

  // ========================================
  // 🔄 GESTIÓN DE PESTAÑAS Y LIMPIEZA
  // ========================================

  // Limpiar formularios y validaciones al cambiar de pestaña
  $('#authTabs button[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {
    // Limpiar todos los campos de ambos formularios
    $('#loginForm, #registerForm').each(function() {
      this.reset();
    });
    
    // Limpiar todas las validaciones visuales
    $('#authModal .form-control').removeClass('is-valid is-invalid');
    $('#authModal .field-feedback').remove();
    
    // Restaurar botones a su estado original
    $('#authModal button[type="submit"]').each(function() {
      const $btn = $(this);
      $btn.prop('disabled', false)
          .removeClass('loading')
          .html($btn.data('original-text') || $btn.html());
    });
  });

  // Guardar texto original de los botones al cargar la página
  $(document).ready(function() {
    $('#authModal button[type="submit"]').each(function() {
      $(this).data('original-text', $(this).html());
    });
  });

  // Función para validar en tiempo real con debounce
  let validationTimeout;
  function debounceValidation(callback, delay = 300) {
    clearTimeout(validationTimeout);
    validationTimeout = setTimeout(callback, delay);
  }

  // Mejorar la validación de cédula con formato visual
  $('#cedula, #newCedula').on('input', function() {
    const $field = $(this);
    let value = $field.val().replace(/[^\d]/g, '');
    
    // Limitar a 10 dígitos
    if (value.length > 10) {
      value = value.substring(0, 10);
    }
    
    $field.val(value);
    
    // Validación con debounce para mejor rendimiento
    debounceValidation(() => {
      if (value.length > 0) {
        const validation = validateCedula(value);
        showFieldFeedback($field.attr('id'), validation);
        
        // Mostrar progreso visual de la cédula
        if (value.length < 10 && value.length > 0) {
          showFieldFeedback($field.attr('id'), {
            isValid: false,
            message: `${value.length}/10 dígitos ingresados`
          });
        }
      } else {
        clearFieldFeedback($field.attr('id'));
      }
    }, 150);
  });

  // Función mejorada para validar fuerza de contraseña
  function getPasswordStrength(password) {
    let score = 0;
    let feedback = [];
    
    if (password.length >= 6) score += 1;
    else feedback.push('mínimo 6 caracteres');
    
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('una letra minúscula');
    
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('una letra mayúscula');
    
    if (/\d/.test(password)) score += 1;
    else feedback.push('un número');
    
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    
    const strength = ['Muy débil', 'Débil', 'Regular', 'Buena', 'Excelente'][score];
    const isValid = score >= 3;
    
    let message = '';
    if (isValid) {
      message = `✓ Contraseña ${strength.toLowerCase()}`;
    } else {
      message = `Faltan: ${feedback.join(', ')}`;
    }
    
    return { isValid, message, score, strength };
  }

  // Función para comprobar si el usuario está autenticado y configurar la interfaz
  function checkAuthStatusAndSetupUI() {
    // Verificar si hay un usuario en sesión (verificando localStorage o sessionStorage)
    const userToken = localStorage.getItem('token');
    const userInfo = localStorage.getItem('user');
    
    if (userToken && userInfo) {
      // Usuario autenticado: ocultar botón "Comenzar Aventura"
      const adventureButton = document.querySelector('.hero-buttons .btn-primary');
      if (adventureButton) {
        adventureButton.style.display = 'none';
      }
      
      // Opcionalmente, modificar el diseño para compensar el botón eliminado
      const catalogButton = document.querySelector('.hero-buttons .btn-outline-light');
      if (catalogButton) {
        catalogButton.classList.add('w-100'); // Hacer que el botón de catálogo ocupe todo el ancho
      }
      
      // Mostrar la sección de acceso rápido para usuarios autenticados
      const quickAccessSection = document.getElementById('quick-access-section');
      if (quickAccessSection) {
        quickAccessSection.style.display = 'block';
      }
    }
  }

  // Ejecutar la comprobación cuando se carga la página
  document.addEventListener('DOMContentLoaded', function() {
    // Verificar estado de autenticación y configurar UI
    checkAuthStatusAndSetupUI();
  });

  // Manejar eventos de autenticación exitosa
  function handleSuccessfulAuth() {
    // Actualizar la UI inmediatamente después del inicio de sesión
    checkAuthStatusAndSetupUI();
  }
});
