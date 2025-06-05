$(function() {
  // Verificar autenticación de administrador
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  
  if (!token) {
    window.location.href = '/auth/login?redirect=/admin/users';
    return;
  }
  
  if (role !== 'ROLE_ADMIN') {
    window.location.href = '/';
    return;
  }
  
  // Variables para paginación y filtrado
  let currentPage = 0;
  let pageSize = 10;
  let totalPages = 0;
  let searchQuery = '';
  let userTypeFilter = 'usuario'; // Por defecto, mostrar usuarios normales

  // Variables para el usuario en edición
  let originalUserData = {};
  // Variables para modales
  let userEditModal;
  let userCreateModal;
  
  // Inicializar modales
  document.addEventListener('DOMContentLoaded', function() {
    userEditModal = new bootstrap.Modal(document.getElementById('user-edit-modal'));
    userCreateModal = new bootstrap.Modal(document.getElementById('user-create-modal'));
  });
  
  // Cargar navbar y usuarios iniciales
  loadNavbar();
  loadUsers();
  
  // Event listeners
  $('#search-btn').on('click', function() {
    searchQuery = $('#search-input').val().trim();
    currentPage = 0;
    
    // Si hay texto en el campo de búsqueda, cambiar visualmente el selector a "Todos los usuarios"
    if (searchQuery !== '') {
      $('#user-type-filter').val('todos');
      // Nota: No cambiamos userTypeFilter aquí, solo la visualización del selector
    }
    
    loadUsers();
  });
  
  $('#search-input').on('keypress', function(e) {
    if (e.which === 13) {
      searchQuery = $('#search-input').val().trim();
      currentPage = 0;
      
      // Si hay texto en el campo de búsqueda, cambiar visualmente el selector a "Todos los usuarios"
      if (searchQuery !== '') {
        $('#user-type-filter').val('todos');
        // Nota: No cambiamos userTypeFilter aquí, solo la visualización del selector
      }
      
      loadUsers();
    }
  });
  
  // Listener para el cambio de tipo de usuario
  $('#user-type-filter').on('change', function() {
    userTypeFilter = $(this).val();
    currentPage = 0;
    searchQuery = '';
    $('#search-input').val('');
    loadUsers();
  });
  
  // Botón de actualizar
  $('#refresh-btn').on('click', function() {
    userTypeFilter = 'todos';
    $('#user-type-filter').val('todos');
    searchQuery = '';
    $('#search-input').val('');
    currentPage = 0;
    loadUsers();
  });

  // Event delegation para el botón "Ver detalles"
  $(document).on('click', '.view-user-details', function(e) {
    e.preventDefault();
    const cedula = $(this).data('cedula');
    loadUserDetails(cedula);
  });
  
  // Event delegation para el botón "Editar"
  $(document).on('click', '.edit-user-btn', function(e) {
    e.preventDefault();
    const cedula = $(this).data('cedula');
    loadUserForEdit(cedula);
  });
  
  // Botón para guardar cambios en el formulario de edición
  $('#save-user-changes-btn').on('click', function() {
    saveUserChanges();
  });
  
  // Botón para crear nuevo usuario
  $('#create-user-btn').on('click', function() {
    // Limpiar formulario
    $('#user-create-form')[0].reset();
    $('#create-error-message').hide();
    
    // Mostrar modal - usar Bootstrap directamente sin referencia guardada
    const createModal = new bootstrap.Modal(document.getElementById('user-create-modal'));
    createModal.show();
  });
  
  // Botón para guardar nuevo usuario
  $('#save-new-user-btn').on('click', function() {
    createUser();
  });
  
  // Funciones
  function loadNavbar() {
    $('#navbar-container').load('/partials/navbar-admin');
  }
  
  function loadUsers() {
    $('#loading-users').show();
    $('#users-table-container').hide();
    $('#no-users-message').hide();
    
    // Construir URL base según el filtro de tipo de usuario y búsqueda
    let url;
    
    if (searchQuery) {
      // Si hay un texto de búsqueda, siempre usar la API de búsqueda por cédula
      url = `${window.API_BASE_URL}/admin/usuarios/buscar-todos?cedula=${encodeURIComponent(searchQuery)}&page=${currentPage}&size=${pageSize}`;
    } else {
      // Si no hay búsqueda, usar el filtro de tipo de usuario
      if (userTypeFilter === 'todos') {
        url = `${window.API_BASE_URL}/admin/usuarios/todos?page=${currentPage}&size=${pageSize}`;
      } else {
        url = `${window.API_BASE_URL}/admin/usuarios/tipo/${userTypeFilter}?page=${currentPage}&size=${pageSize}`;
      }
    }
    
    console.log('Cargando usuarios desde URL:', url);
    
    $.ajax({
      url: url,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        $('#loading-users').hide();
        
        if (data && data.content && data.content.length > 0) {
          renderUsers(data.content);
          renderPagination(data);
          $('#users-table-container').show();
        } else {
          $('#no-users-message').show();
        }
      },
      error: function(xhr) {
        $('#loading-users').hide();
        
        if (xhr.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          window.location.href = '/auth/login?redirect=/admin/users';
        } else {
          showToast('error', 'Error al cargar los usuarios: ' + (xhr.responseJSON?.mensaje || xhr.statusText));
          $('#no-users-message').show();
        }
      }
    });
  }
  
  function renderUsers(users) {
    const $tbody = $('#users-table-body');
    $tbody.empty();
    
    users.forEach(user => {
      // Formatear fecha
      const fecha = new Date(user.fechaRegistro);
      const fechaFormateada = fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Estado del usuario basado en si tiene cliente
      const estadoClase = user.tieneCliente ? 'bg-success' : 'bg-warning';
      const estadoTexto = user.tieneCliente ? 'Activo' : 'Incompleto';
      
      // Clase para distinguir visualmente entre usuarios y administradores
      const rowClass = user.tipoUsuario === 'admin' ? 'table-primary' : '';
      
      $tbody.append(`
        <tr class="${rowClass}">
          <td>${user.cedula}</td>
          <td>
            <span class="badge ${user.tipoUsuario === 'admin' ? 'bg-danger' : 'bg-info'}">
              ${user.tipoUsuario === 'admin' ? 'Administrador' : 'Usuario'}
            </span>
          </td>
          <td>${fechaFormateada}</td>
          <td>
            <span class="badge ${estadoClase}">
              ${estadoTexto}
            </span>
          </td>
          <td>
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-primary edit-user-btn" data-cedula="${user.cedula}">
                <i class="bi bi-pencil"></i> Editar
              </button>
              <button class="btn btn-outline-info view-user-details" data-cedula="${user.cedula}">
                <i class="bi bi-eye"></i> Ver
              </button>
              <button class="btn btn-outline-danger delete-user-btn" data-cedula="${user.cedula}" data-tipo="${user.tipoUsuario}">
                <i class="bi bi-trash"></i> Eliminar
              </button>
            </div>
          </td>
        </tr>
      `);
    });
  }
  
  function loadUserDetails(cedula) {
    // Mostrar modal y spinner de carga
    $('#user-detail-modal').modal('show');
    $('#user-detail-loading').show();
    $('#user-detail-content').hide();
    $('#no-cliente-alert').hide();
    
    // Realizar petición AJAX para obtener los detalles completos del usuario
    $.ajax({
      url: `${window.API_BASE_URL}/admin/usuarios/buscar-completo/${cedula}`,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        // Ocultar spinner de carga
        $('#user-detail-loading').hide();
        
        // Mostrar los detalles del usuario
        $('#detail-cedula').text(data.usuario.cedula);
        
        // Convertir el tipo de usuario a formato más legible
        const tipoUsuario = data.usuario.tipoUsuario === 'admin' ? 'Administrador' : 'Usuario';
        $('#detail-tipo-usuario').text(tipoUsuario);
        
        // Formatear fecha
        const fecha = new Date(data.usuario.fechaRegistro);
        const fechaFormateada = fecha.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        $('#detail-fecha-registro').text(fechaFormateada);
        
        // Estado del usuario
        const estadoClase = data.tieneCliente ? 'bg-success' : 'bg-warning';
        const estadoTexto = data.tieneCliente ? 'Activo' : 'Incompleto';
        $('#detail-estado').html(`<span class="badge ${estadoClase}">${estadoTexto}</span>`);
        
        // Si el usuario tiene datos de cliente, mostrarlos
        if (data.tieneCliente && data.datosCliente) {
          $('#detail-nombre').text(data.datosCliente.nombre || 'No especificado');
          $('#detail-apellido').text(data.datosCliente.apellido || 'No especificado');
          $('#detail-correo').text(data.datosCliente.correo || 'No especificado');
          $('#detail-telefono').text(data.datosCliente.telefono || 'No especificado');
          $('#detail-cliente-card').show();
        } else {
          $('#detail-cliente-card').hide();
          $('#no-cliente-alert').show();
        }
        
        // Mostrar contenido del modal
        $('#user-detail-content').show();
      },
      error: function(xhr) {
        // Ocultar spinner de carga
        $('#user-detail-loading').hide();
        
        // Mostrar mensaje de error
        $('#user-detail-content').html(`
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            Error al cargar los detalles del usuario: ${xhr.responseJSON?.mensaje || xhr.status}
          </div>
        `).show();
      }
    });
  }
  
  function loadUserForEdit(cedula) {
    // Mostrar modal con spinner de carga
    $('#user-edit-loading').show();
    $('#user-edit-form').hide();
    $('#edit-error-message').hide();
    
    // Restablecer el botón a su estado original
    $('#save-user-changes-btn').prop('disabled', false).html('Guardar Cambios');
    
    // Abrir el modal
    const userEditModal = new bootstrap.Modal(document.getElementById('user-edit-modal'));
    userEditModal.show();
    
    // Cargar datos del usuario
    $.ajax({
      url: `${window.API_BASE_URL}/admin/usuarios/buscar-completo/${cedula}`,
      type: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(data) {
        // Guardar los datos originales para comparar al guardar
        originalUserData = { ...data };
        
        // Llenar el formulario con los datos actuales
        $('#edit-user-cedula').val(cedula);
        $('#edit-user-cedula-display').val(cedula);
        $('#edit-user-type').val(data.usuario.tipoUsuario);
        
        // Llenar datos del cliente si existen
        if (data.tieneCliente && data.datosCliente) {
          $('#edit-user-nombre').val(data.datosCliente.nombre || '');
          $('#edit-user-apellido').val(data.datosCliente.apellido || '');
          $('#edit-user-correo').val(data.datosCliente.correo || '');
          $('#edit-user-telefono').val(data.datosCliente.telefono || '');
        } else {
          // Incluso si no tiene datos de cliente, permitimos editarlos
          $('#edit-user-nombre').val('');
          $('#edit-user-apellido').val('');
          $('#edit-user-correo').val('');
          $('#edit-user-telefono').val('');
        }
        
        // Siempre vaciar el campo de contraseña
        $('#edit-user-password').val('');
        
        // Ocultar spinner y mostrar formulario
        $('#user-edit-loading').hide();
        $('#user-edit-form').show();
      },
      error: function(xhr) {
        $('#user-edit-loading').hide();
        
        let errorMsg = 'Error al cargar los datos del usuario';
        if (xhr.responseJSON && xhr.responseJSON.mensaje) {
          errorMsg = xhr.responseJSON.mensaje;
        }
        
        $('#edit-error-message').text(errorMsg).show();
      }
    });
  }
  
  function saveUserChanges() {
    // Obtener valores del formulario
    const cedula = $('#edit-user-cedula').val();
    const nombre = $('#edit-user-nombre').val().trim();
    const apellido = $('#edit-user-apellido').val().trim();
    const correo = $('#edit-user-correo').val().trim();
    const telefono = $('#edit-user-telefono').val().trim();
    const password = $('#edit-user-password').val();
    
    // Verificar que la cédula no esté vacía
    if (!cedula) {
      $('#edit-error-message').text('Error: Cédula inválida').show();
      return;
    }
    
    // Crear objeto con solo los campos modificados
    const cambios = {};
    
    // Comparar con valores originales y añadir solo si hay cambios
    const datosCliente = originalUserData.datosCliente || {};
    
    if (nombre !== (datosCliente.nombre || '')) cambios.nombre = nombre;
    if (apellido !== (datosCliente.apellido || '')) cambios.apellido = apellido;
    if (correo !== (datosCliente.correo || '')) cambios.correo = correo;
    if (telefono !== (datosCliente.telefono || '')) cambios.telefono = telefono;
    
    // Añadir contraseña solo si se ha ingresado una nueva
    if (password) cambios.password = password;
    
    // Verificar si hay cambios
    if (Object.keys(cambios).length === 0) {
      $('#edit-error-message').text('No se han realizado cambios').show();
      return;
    }
    
    // Mostrar resumen de cambios al usuario
    let resumenCambios = 'Se actualizarán los siguientes campos:<br>';
    if (cambios.nombre) resumenCambios += '- Nombre<br>';
    if (cambios.apellido) resumenCambios += '- Apellido<br>';
    if (cambios.correo) resumenCambios += '- Correo<br>';
    if (cambios.telefono) resumenCambios += '- Teléfono<br>';
    if (cambios.password) resumenCambios += '- Contraseña<br>';
    
    // Confirmar antes de guardar
    if (!confirm(`${resumenCambios}\n¿Desea continuar?`)) {
      return;
    }
    
    // Deshabilitar botón y mostrar indicador
    $('#save-user-changes-btn').prop('disabled', true).html(
      '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Guardando...'
    );
    
    // Enviar cambios al servidor
    $.ajax({
      url: `${window.API_BASE_URL}/admin/usuarios/actualizar/${cedula}`,
      type: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(cambios),
      success: function() {
        // Restablecer el botón aunque vayamos a cerrar el modal
        $('#save-user-changes-btn').prop('disabled', false).html('Guardar Cambios');
        
        // Cerrar modal y mostrar mensaje de éxito
        const userEditModal = bootstrap.Modal.getInstance(document.getElementById('user-edit-modal'));
        userEditModal.hide();
        
        showToast('success', 'Usuario actualizado correctamente');
        
        // Recargar la lista de usuarios
        loadUsers();
      },
      error: function(xhr) {
        let errorMsg = 'Error al actualizar el usuario';
        if (xhr.responseJSON && xhr.responseJSON.mensaje) {
          errorMsg = xhr.responseJSON.mensaje;
        }
        
        $('#edit-error-message').text(errorMsg).show();
        
        // Reactivar botón
        $('#save-user-changes-btn').prop('disabled', false).html('Guardar Cambios');
      }
    });
  }
  
  // Función para crear un nuevo usuario
  function createUser() {
    // Obtener valores del formulario
    const cedula = $('#new-user-cedula').val().trim();
    const password = $('#new-user-password').val();
    const tipoUsuario = $('#new-user-type').val();
    
    // Validaciones básicas
    if (!cedula) {
      $('#create-error-message').text('La cédula es obligatoria').show();
      return;
    }
    
    if (!password) {
      $('#create-error-message').text('La contraseña es obligatoria').show();
      return;
    }
    
    // Crear objeto de usuario
    const userData = {
      cedula: cedula,
      password: password,
      tipoUsuario: tipoUsuario
    };
    
    // Deshabilitar botón mientras se procesa
    $('#save-new-user-btn').prop('disabled', true).html(
      '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Creando...'
    );
    
    // Enviar petición al servidor
    $.ajax({
      url: `${window.API_BASE_URL}/admin/usuarios`,
      type: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(userData),
      success: function(response) {
        // Cerrar modal usando Bootstrap directamente
        const modalElement = document.getElementById('user-create-modal');
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        modalInstance.hide();
        
        // Mostrar mensaje de éxito
        showToast('success', `Usuario ${response.tipoUsuario === 'admin' ? 'administrador' : 'normal'} creado correctamente`);
        
        // Recargar la lista de usuarios
        setTimeout(function() {
          // Si el tipo de usuario creado coincide con el filtro actual, mantener el filtro
          // Si no, cambiar a "todos" para mostrar el nuevo usuario
          if (userTypeFilter !== response.tipoUsuario && userTypeFilter !== 'todos') {
            userTypeFilter = 'todos';
            $('#user-type-filter').val('todos');
          }
          loadUsers();
        }, 1000);
      },
      error: function(xhr) {
        // Mostrar mensaje de error
        let errorMsg = 'Error al crear el usuario';
        if (xhr.responseJSON && xhr.responseJSON.mensaje) {
          errorMsg = xhr.responseJSON.mensaje;
        }
        $('#create-error-message').text(errorMsg).show();
        
        // Reactivar el botón
        $('#save-new-user-btn').prop('disabled', false).html('Crear Usuario');
      }
    });
  }
  
  function renderPagination(data) {
    const $pagination = $('#pagination');
    $pagination.empty();
    
    totalPages = data.totalPages || 1;
    
    if (totalPages <= 1) return;
    
    // Botón "Anterior"
    $pagination.append(`
      <li class="page-item ${currentPage === 0 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage - 1}">&laquo;</a>
      </li>
    `);
    
    // Botones de números de página
    for (let i = 0; i < totalPages; i++) {
      if (totalPages > 7 && i > 1 && i < totalPages - 2) {
        // Si hay muchas páginas, mostrar puntos suspensivos
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
    
    // Botón "Siguiente"
    $pagination.append(`
      <li class="page-item ${currentPage === totalPages - 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage + 1}">&raquo;</a>
      </li>
    `);
    
    // Event listener para cambios de página
    $pagination.find('.page-link').on('click', function(e) {
      e.preventDefault();
      const page = parseInt($(this).data('page'));
      
      if (!isNaN(page) && page >= 0 && page < totalPages) {
        currentPage = page;
        loadUsers();
      }
    });
  }
  
  function showToast(type, message) {
    // Usar la función global de toast si está disponible
    if (typeof window.showGlobalToast === 'function') {
      window.showGlobalToast(type, message);
    } else {
      // Fallback a un simple alert
      alert(message);
    }
  }
  
  // Event delegation para el botón "Eliminar"
  $(document).on('click', '.delete-user-btn', function(e) {
    e.preventDefault();
    const cedula = $(this).data('cedula');
    const tipoUsuario = $(this).data('tipo');
    
    // Mostrar confirmación antes de eliminar
    if (confirm(`¿Está seguro que desea eliminar el usuario ${cedula}? Esta acción no se puede deshacer.`)) {
      deleteUser(cedula);
    }
  });
  
  // Función para eliminar usuario
  function deleteUser(cedula) {
    $.ajax({
      url: `${window.API_BASE_URL}/admin/usuarios/${cedula}`,
      type: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      success: function(response) {
        // Mostrar mensaje de éxito
        showToast('success', response.mensaje || 'Usuario eliminado correctamente');
        
        // Recargar la lista de usuarios
        loadUsers();
      },
      error: function(xhr) {
        let errorMsg = 'Error al eliminar el usuario';
        if (xhr.responseJSON && xhr.responseJSON.mensaje) {
          errorMsg = xhr.responseJSON.mensaje;
        }
        
        showToast('error', errorMsg);
      }
    });
  }
});
