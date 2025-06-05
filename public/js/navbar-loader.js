/**
 * Script para cargar automáticamente la navbar correspondiente en todas las páginas
 */
$(document).ready(function() {
  // Si existe un contenedor para la navbar, cargarla según el rol del usuario
  if ($('#navbar-container').length > 0) {
    loadNavbar();
  }
  
  function loadNavbar() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    let navbarType;
    
    if (!token) {
      // Usuario no autenticado - usar navbar de invitado
      navbarType = 'navbar-guest';
    } else if (role === 'ROLE_ADMIN') {
      // Usuario administrador
      navbarType = 'navbar-admin';
    } else {
      // Usuario normal
      navbarType = 'navbar-user';
    }
    
    // Cargar la navbar en el contenedor
    $('#navbar-container').load(`/partials/${navbarType}`, function(response, status) {
      if (status === 'error') {
        console.error('Error al cargar la navbar:', status);
        // Fallback a la navbar de invitado en caso de error
        $('#navbar-container').load('/partials/navbar-guest');
      }
      
      // Una vez cargada la navbar, actualizar el contador del carrito si es necesario
      if (typeof updateCartCounter === 'function') {
        updateCartCounter();
      }
    });
  }
});
