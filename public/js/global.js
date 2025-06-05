$(document).ready(function() {
    // Global AJAX setup
    $.ajaxSetup({
        cache: false
    });

    // Manejador de errores global para AJAX
    $(document).ajaxError(function(event, jqXHR, settings, thrownError) {
        // Evitar mostrar errores duplicados para peticiones que ya tienen su propio manejador
        if (settings.global === false) return;
        
        console.error('Error en petición AJAX:', thrownError);
        
        // Usar toast en lugar de modal para mayor consistencia con el resto del sistema
        showGlobalToast('error', 'Ha ocurrido un error en la operación');
    });

    // Evitar alerts nativos por errores de JavaScript
    window.onerror = function(message, source, lineno, colno, error) {
        console.error('Error de JavaScript:', message, source, lineno, colno, error);
        
        // Usar toast en lugar de modal
        showGlobalToast('error', 'Ha ocurrido un error en la operación');
        
        return true; // Evitar que se muestre el alert nativo
    };

    // Add global spinner for AJAX requests
    $(document).ajaxStart(function() {
        $('body').addClass('ajax-loading');
    }).ajaxStop(function() {
        $('body').removeClass('ajax-loading');
    });

    console.log("Global JavaScript initialized");

    // Verificar si el usuario está autenticado y tiene perfil incompleto
    const token = localStorage.getItem('token');
    const profileComplete = localStorage.getItem('profileComplete');
      if (token && profileComplete === 'false') {
        // Solo mostrar en páginas que no sean el perfil
        if (!window.location.pathname.includes('/profile')) {
            // Crear el banner profesional mejorado
            const banner = `
                <div class="professional-profile-banner" role="alert" id="profile-banner">
                    <div class="container d-flex align-items-center py-3">
                        <div class="banner-icon">
                            <i class="bi bi-person-fill-check"></i>
                        </div>
                        <div class="banner-content">
                            <h6 class="banner-title">¡Completa tu perfil para comenzar!</h6>
                            <p class="banner-subtitle">
                                Añade tu información personal para desbloquear todas las funcionalidades y realizar compras.
                            </p>
                        </div>
                        <div class="banner-actions">
                            <a href="/profile" class="btn-complete-profile">
                                <i class="bi bi-person-fill-gear"></i>
                                Completar Ahora
                            </a>
                            <button type="button" class="btn-close-modern" id="close-profile-banner" aria-label="Cerrar">
                                <i class="bi bi-x-lg" style="color: #e91e63; font-size: 0.9rem;"></i>
                            </button>
                        </div>
                    </div>
                    <div class="progress-indicator"></div>
                </div>
            `;
            
            $('body').prepend(banner);
            
            // Manejar el cierre del banner con animación
            $('#close-profile-banner').on('click', function() {
                const bannerElement = $('#profile-banner');
                bannerElement.addClass('dismissing');
                
                setTimeout(function() {
                    bannerElement.remove();
                }, 400); // Tiempo de la animación de salida
            });
        }
    }
    
    // Función global para mostrar toast
    window.showGlobalToast = function(type, message) {
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
        
        // Crear el contenedor de toast si no existe
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
    };
});
