$(function() {
  // Verificar autenticación de administrador
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  
  if (!token) {
    window.location.href = '/auth/login?redirect=/admin/products';
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
  let categoryFilter = 0; // 0 significa todas las categorías
  
  // Cargar navbar y datos iniciales
  loadNavbar();
  loadCategories();
  loadProducts();
  
  // Event listeners
  $('#search-btn').on('click', function() {
    searchQuery = $('#search-input').val().trim();
    
    if (searchQuery) {
      // Si hay texto en la búsqueda, cambiar automáticamente a "Todas las categorías"
      categoryFilter = 0;
      $('#category-filter').val(0);
    }
    
    currentPage = 0;
    loadProducts();
  });
  
  $('#search-input').on('keypress', function(e) {
    if (e.which === 13) {
      searchQuery = $('#search-input').val().trim();
      
      if (searchQuery) {
        // Si hay texto en la búsqueda, cambiar automáticamente a "Todas las categorías"
        categoryFilter = 0;
        $('#category-filter').val(0);
      }
      
      currentPage = 0;
      loadProducts();
    }
  });
  
  // Listener para el cambio de categoría
  $('#category-filter').on('change', function() {
    categoryFilter = $(this).val();
    currentPage = 0;
    searchQuery = ''; // Limpiar búsqueda al cambiar de categoría
    $('#search-input').val('');
    loadProducts();
  });
  
  // Botón de actualizar
  $('#refresh-btn').on('click', function() {
    searchQuery = '';
    $('#search-input').val('');
    loadProducts();
  });

  // Event delegation para el botón "Ver detalles"
  $(document).on('click', '.view-product-details', function(e) {
    e.preventDefault();
    const productId = $(this).data('id');
    loadProductDetails(productId);
  });
  
  // Botón para crear nuevo producto
  $('#create-product-btn').on('click', function() {
    // Limpiar formulario
    $('#product-form')[0].reset();
    $('#product-id').val('');
    $('#product-modal-title').text('Crear Nuevo Producto');
    
    // Reiniciar contenedor de imágenes
    $('#images-container').html(`
      <div class="input-group mb-2">
        <span class="input-group-text"><i class="bi bi-image"></i></span>
        <input type="text" class="form-control image-url" placeholder="URL de la imagen">
        <button type="button" class="btn btn-outline-danger remove-image" disabled>
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `);
    
    // Reiniciar vista previa
    $('#image-preview').html('<div class="text-muted small">No hay imágenes para previsualizar</div>');
    
    // Ocultar mensajes de error
    $('#product-form-error').hide();
    
    // Cargar categorías si es necesario
    if ($('#product-category option').length <= 1) {
      loadCategories();
    }
    
    // Mostrar modal
    const productModal = new bootstrap.Modal(document.getElementById('product-modal'));
    productModal.show();
  });
  
  // Botón para agregar otra imagen
  $(document).on('click', '#add-image-btn', function() {
    $('#images-container').append(`
      <div class="input-group mb-2">
        <span class="input-group-text"><i class="bi bi-image"></i></span>
        <input type="text" class="form-control image-url" placeholder="URL de la imagen">
        <button type="button" class="btn btn-outline-danger remove-image">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    `);
  });
  
  // Botón para eliminar una imagen
  $(document).on('click', '.remove-image', function() {
    // Solo eliminar si hay más de una imagen
    if ($('#images-container .input-group').length > 1) {
      $(this).closest('.input-group').remove();
      // Actualizar la vista previa después de eliminar la URL
      updateImagePreviews();
    }
  });
  
  // Event listener para previsualizar imágenes cuando cambia una URL
  $(document).on('input', '.image-url', function() {
    updateImagePreviews();
  });
  
  // Botón para guardar producto
  $('#save-product-btn').on('click', function() {
    saveProduct();
  });
  
  // Funciones
  function loadNavbar() {
    $('#navbar-container').load('/partials/navbar-admin');
  }
  
  function loadCategories() {
    $.ajax({
      url: `${window.API_BASE_URL}/categorias/simple`,
      type: 'GET',
      success: function(data) {
        // Actualizar selector de filtro de categorías en la página principal
        const $filterSelect = $('#category-filter');
        
        // Mantener solo la opción "Todas las categorías" que ya está en el HTML
        $filterSelect.find('option:not(:first)').remove();
        
        // Agregar las categorías de la API
        data.forEach(category => {
          $filterSelect.append(`<option value="${category.idCategoria}">${category.nombre}</option>`);
        });
        
        // También actualizar el selector de categorías en el modal de creación
        const $modalSelect = $('#product-category');
        $modalSelect.find('option:not(:first)').remove();
        
        // Agregar las categorías al selector del modal
        data.forEach(category => {
          $modalSelect.append(`<option value="${category.idCategoria}">${category.nombre}</option>`);
        });
      },
      error: function(xhr) {
        console.error('Error al cargar categorías:', xhr);
        showToast('error', 'No se pudieron cargar las categorías');
      }
    });
  }
  
  function loadProducts() {
    $('#loading-products').show();
    $('#products-table-container').hide();
    $('#no-products-message').hide();
    
    // Construir URL según los filtros
    let url;
    
    if (searchQuery) {
      // Si hay búsqueda, usar la API de búsqueda por nombre
      url = `${window.API_BASE_URL}/productos/buscar?nombre=${encodeURIComponent(searchQuery)}&page=${currentPage}&size=${pageSize}`;
    } else if (categoryFilter == 0) {
      // Si no hay filtro de categoría, cargar todos
      url = `${window.API_BASE_URL}/productos/todos`;
    } else {
      // Si hay filtro de categoría, cargar por categoría
      url = `${window.API_BASE_URL}/productos/categoria/${categoryFilter}`;
    }
    
    console.log('Cargando productos desde URL:', url);
    
    $.ajax({
      url: url,
      type: 'GET',
      success: function(data) {
        $('#loading-products').hide();
        
        // Manejar tanto respuestas paginadas como listas simples
        if (data.content && Array.isArray(data.content)) {
          // Es una respuesta paginada
          if (data.content.length > 0) {
            renderProducts(data.content);
            renderPagination(data);
            $('#products-table-container').show();
          } else {
            $('#no-products-message').show();
          }
        } else if (Array.isArray(data)) {
          // Es un array simple
          if (data.length > 0) {
            renderProducts(data);
            $('#products-table-container').show();
          } else {
            $('#no-products-message').show();
          }
        } else {
          $('#no-products-message').show();
        }
      },
      error: function(xhr) {
        $('#loading-products').hide();
        
        if (xhr.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          window.location.href = '/auth/login?redirect=/admin/products';
        } else {
          showToast('error', 'Error al cargar los productos: ' + (xhr.responseJSON?.mensaje || xhr.statusText));
          $('#no-products-message').show();
        }
      }
    });
  }
  
  function renderProducts(products) {
    const $tbody = $('#products-table-body');
    $tbody.empty();
    
    products.forEach(product => {
      // Determinar el estado del stock
      let stockBadgeClass = 'bg-success';
      let stockText = product.prodStock;
      
      if (product.prodStock <= 0) {
        stockBadgeClass = 'bg-danger';
        stockText = 'Agotado';
      } else if (product.prodStock < 10) {
        stockBadgeClass = 'bg-warning text-dark';
      }
      
      // Obtener la primera imagen (imagen principal)
      const mainImage = product.imagenesUrl && product.imagenesUrl.length > 0 
        ? product.imagenesUrl[0] 
        : '/img/no-image.png';
      
      // Formatear precio
      const formattedPrice = formatPrice(product.prodPrecio);
      
      $tbody.append(`
        <tr>
          <td>
            <img src="${mainImage}" alt="${product.prodNombre}" class="product-thumbnail" 
                 style="width: 50px; height: 50px; object-fit: cover;"
                 onerror="this.onerror=null; this.src='/img/no-image.png';">
          </td>
          <td>${product.idProducto}</td>
          <td>${product.prodNombre}</td>
          <td>$${formattedPrice}</td>
          <td>
            <span class="badge ${stockBadgeClass}">${stockText}</span>
          </td>
          <td>${product.categoriaNombre}</td>
          <td>
            <div class="btn-group btn-group-sm" role="group">
              <button type="button" class="btn btn-outline-info view-product-details" data-id="${product.idProducto}">
                <i class="bi bi-eye"></i> Ver
              </button>
              <button type="button" class="btn btn-primary edit-product-btn" data-id="${product.idProducto}">
                <i class="bi bi-pencil"></i> Editar
              </button>
              <button type="button" class="btn btn-danger delete-product-btn" 
                      data-id="${product.idProducto}" 
                      data-name="${product.prodNombre}">
                <i class="bi bi-trash"></i> Eliminar
              </button>
            </div>
          </td>
        </tr>
      `);
    });
  }
  
  function loadProductDetails(productId) {
    // Mostrar modal con spinner de carga
    $('#product-detail-modal').modal('show');
    $('#product-detail-loading').show();
    $('#product-detail-content').hide();
    
    // Obtener detalles del producto
    // Por ahora, como no hay un endpoint específico para detalles,
    // buscamos el producto en la lista de todos los productos
    $.ajax({
      url: `${window.API_BASE_URL}/productos/todos`,
      type: 'GET',
      success: function(products) {
        const product = products.find(p => p.idProducto == productId);
        
        if (product) {
          renderProductDetails(product);
        } else {
          $('#product-detail-loading').hide();
          $('#product-detail-content').html('<div class="alert alert-warning">Producto no encontrado</div>').show();
        }
      },
      error: function(xhr) {
        $('#product-detail-loading').hide();
        $('#product-detail-content').html('<div class="alert alert-danger">Error al cargar los detalles del producto</div>').show();
      }
    });
  }
  
  function renderProductDetails(product) {
    // Llenar datos básicos
    $('#detail-nombre').text(product.prodNombre);
    $('#detail-descripcion').text(product.prodDescripcion);
    $('#detail-precio').text(formatPrice(product.prodPrecio));
    $('#detail-stock').text(product.prodStock);
    $('#detail-categoria').text(product.categoriaNombre);
    $('#detail-proveedor').text(product.prodProveedor);
    
    // Estado del stock
    let stockBadgeClass = 'bg-success';
    let stockText = 'En stock';
    
    if (product.prodStock <= 0) {
      stockBadgeClass = 'bg-danger';
      stockText = 'Agotado';
    } else if (product.prodStock < 10) {
      stockBadgeClass = 'bg-warning text-dark';
      stockText = 'Stock bajo';
    }
    
    $('#detail-stock-badge').attr('class', `badge ${stockBadgeClass}`).text(stockText);
    
    // Cargar imágenes en el carrusel
    const $imagesContainer = $('#detail-images-container');
    $imagesContainer.empty();
    
    if (product.imagenesUrl && product.imagenesUrl.length > 0) {
      product.imagenesUrl.forEach((imageUrl, index) => {
        $imagesContainer.append(`
          <div class="carousel-item ${index === 0 ? 'active' : ''}">
            <img src="${imageUrl}" class="d-block w-100" alt="${product.prodNombre}" style="height: 300px; object-fit: contain;">
          </div>
        `);
      });
    } else {
      $imagesContainer.append(`
        <div class="carousel-item active">
          <img src="/img/no-image.png" class="d-block w-100" alt="Sin imagen" style="height: 300px; object-fit: contain;">
        </div>
      `);
    }
    
    // Mostrar contenido y ocultar spinner
    $('#product-detail-loading').hide();
    $('#product-detail-content').show();
  }
  
  function formatPrice(price) {
    return parseFloat(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
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

  // Función para renderizar la paginación
  function renderPagination(data) {
    // Solo renderizar paginación si tenemos datos de paginación
    if (!data.totalPages) return;
    
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
        loadProducts();
      }
    });
  }
  
  // Función para cargar categorías en el select
  function loadCategories() {
    $.ajax({
      url: `${window.API_BASE_URL}/categorias/simple`,
      type: 'GET',
      success: function(data) {
        // Actualizar selector de filtro de categorías en la página principal
        const $filterSelect = $('#category-filter');
        
        // Mantener solo la opción "Todas las categorías" que ya está en el HTML
        $filterSelect.find('option:not(:first)').remove();
        
        // Agregar las categorías de la API
        data.forEach(category => {
          $filterSelect.append(`<option value="${category.idCategoria}">${category.nombre}</option>`);
        });
        
        // También actualizar el selector de categorías en el modal de creación
        const $modalSelect = $('#product-category');
        $modalSelect.find('option:not(:first)').remove();
        
        // Agregar las categorías al selector del modal
        data.forEach(category => {
          $modalSelect.append(`<option value="${category.idCategoria}">${category.nombre}</option>`);
        });
      },
      error: function(xhr) {
        console.error('Error al cargar categorías:', xhr);
        showToast('error', 'No se pudieron cargar las categorías');
      }
    });
  }
  
  // Función para actualizar la vista previa de imágenes
  function updateImagePreviews() {
    const $preview = $('#image-preview');
    $preview.empty();
    
    let hasValidImages = false;
    let index = 0;
    
    // Recorrer todas las URLs de imágenes actuales
    $('.image-url').each(function() {
      const url = $(this).val().trim();
      if (url) {
        hasValidImages = true;
        index++;
        
        // Agregar la imagen a la vista previa with manejo de errores
        $preview.append(`
          <div class="position-relative mb-2">
            <img src="${url}" alt="Vista previa ${index}" class="img-thumbnail" 
                 style="width: 100px; height: 100px; object-fit: cover;"
                 onerror="this.onerror=null; this.src='/img/no-image.png';">
            <div class="position-absolute top-0 end-0 bg-light p-1" style="font-size: 10px;">
              ${index}
            </div>
          </div>
        `);
        
        // Añadir mensaje de log para depuración
        console.log(`Añadida imagen ${index}: ${url}`);
      }
    });
    
    if (!hasValidImages) {
      $preview.html('<div class="text-muted small">No hay imágenes para previsualizar</div>');
      console.log('No se encontraron URLs de imágenes válidas para previsualizar');
    } else {
      console.log(`Total de imágenes mostradas: ${index}`);
    }
  }
  
  // Función para validar el formulario de producto
  function validateProductForm() {
    const nombre = $('#product-name').val().trim();
    const categoria = $('#product-category').val();
    const precio = parseFloat($('#product-price').val());
    const stock = parseInt($('#product-stock').val());
    
    // Validar campos obligatorios
    if (!nombre) {
      $('#product-form-error').text('El nombre del producto es obligatorio').show();
      return false;
    }
    
    if (!categoria) {
      $('#product-form-error').text('Debe seleccionar una categoría').show();
      return false;
    }
    
    if (isNaN(precio) || precio <= 0) {
      $('#product-form-error').text('El precio debe ser un número mayor a 0').show();
      return false;
    }
    
    if (isNaN(stock) || stock < 0) {
      $('#product-form-error').text('El stock debe ser un número mayor o igual a 0').show();
      return false;
    }
    
    // Verificar si hay al menos una imagen
    let tieneImagenes = false;
    $('.image-url').each(function() {
      if ($(this).val().trim()) {
        tieneImagenes = true;
        return false; // Salir del bucle
      }
    });
    
    if (!tieneImagenes) {
      $('#product-form-error').text('Debe agregar al menos una imagen').show();
      return false;
    }
    
    return true;
  }
  
  // Función para guardar producto
  function saveProduct() {
    // Validar formulario
    if (!validateProductForm()) {
      return;
    }
    
    // Obtener valores del formulario
    const nombre = $('#product-name').val().trim();
    const descripcion = $('#product-description').val().trim();
    const precio = parseFloat($('#product-price').val());
    const stock = parseInt($('#product-stock').val());
    const proveedor = $('#product-provider').val().trim();
    const categoria = parseInt($('#product-category').val());
    
    // Obtener URLs de imágenes
    const imagenesUrl = [];
    $('.image-url').each(function() {
      const url = $(this).val().trim();
      if (url) {
        imagenesUrl.push(url);
      }
    });
    
    // Determinar si es nuevo o edición
    const productId = $('#product-id').val();
    const isNew = !productId;
    
    // Si es edición, verificar si hay cambios reales
    if (!isNew && window.originalProductData) {
      const original = window.originalProductData;
      let hayModificaciones = false;
      
      // Verificar campo por campo si hay cambios
      if (nombre !== (original.prodNombre || '')) hayModificaciones = true;
      else if (descripcion !== (original.prodDescripcion || '')) hayModificaciones = true;
      else if (precio !== original.prodPrecio) hayModificaciones = true;
      else if (stock !== original.prodStock) hayModificaciones = true;
      else if (proveedor !== (original.prodProveedor || '')) hayModificaciones = true;
      else if (categoria !== original.idCategoria) hayModificaciones = true;
      
      // Verificar si las imágenes cambiaron
      if (!hayModificaciones) {
        // Si la cantidad de imágenes es diferente, definitivamente cambiaron
        if (!original.imagenesUrl || original.imagenesUrl.length !== imagenesUrl.length) {
          hayModificaciones = true;
        } else {
          // Verificar si alguna URL cambió
          for (let i = 0; i < imagenesUrl.length; i++) {
            if (imagenesUrl[i] !== original.imagenesUrl[i]) {
              hayModificaciones = true;
              break;
            }
          }
        }
      }
      
      // Si no hay cambios, mostrar mensaje y salir
      if (!hayModificaciones) {
        $('#product-form-error').html('No has realizado ningún cambio para guardar.<br>Modifica al menos un campo para actualizar el producto.').show();
        return;
      }
    }
    
    // Obtener datos del producto en el formato correcto
    const productData = {
      prodNombre: nombre,
      prodDescripcion: descripcion,
      prodPrecio: precio,
      prodStock: stock,
      prodProveedor: proveedor,
      idCategoria: categoria,
      imagenesUrl: imagenesUrl
    };
    
    // Imprimir en consola los datos que se van a enviar
    console.log('============ DATOS DEL PRODUCTO A ENVIAR ============');
    console.log('Producto:', productData);
    console.log('Número de imágenes:', productData.imagenesUrl.length);
    console.log('JSON completo:', JSON.stringify(productData, null, 2));
    console.log('===================================================');
    
    // Deshabilitar botón y mostrar indicador de carga
    $('#save-product-btn').prop('disabled', true).html(
      '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Guardando...'
    );
    
    // URL y método según si es nuevo o edición
    const url = isNew 
      ? `${window.API_BASE_URL}/productos-completo` 
      : `${window.API_BASE_URL}/productos-completo/${productId}`;
    const method = isNew ? 'POST' : 'PUT';
    
    console.log(`Enviando ${method} request a: ${url}`);
    
    // Enviar solicitud al servidor
    $.ajax({
      url: url,
      type: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(productData),
      success: function(response) {
        console.log('Respuesta del servidor (éxito):', response);
        // Cerrar modal
        bootstrap.Modal.getInstance(document.getElementById('product-modal')).hide();
        
        // Mostrar mensaje de éxito
        showToast('success', isNew 
          ? 'Producto creado exitosamente' 
          : 'Producto actualizado exitosamente');
        
        // Recargar productos
        loadProducts();
      },
      error: function(xhr) {
        console.error('Error del servidor:', xhr);
        console.error('Status:', xhr.status);
        console.error('Response:', xhr.responseText);
        
        let errorMsg = 'Error al guardar el producto';
        
        if (xhr.responseJSON && xhr.responseJSON.mensaje) {
          errorMsg = xhr.responseJSON.mensaje;
        } else if (xhr.status === 403) {
          errorMsg = 'No tiene permisos para realizar esta acción';
        } else if (xhr.status === 400) {
          errorMsg = 'Datos inválidos. Por favor revise la información ingresada';
        }
        
        $('#product-form-error').text(errorMsg).show();
        
        // Reactivar botón
        $('#save-product-btn').prop('disabled', false).text('Guardar Producto');
      },
      complete: function() {
        // Reactivar botón en cualquier caso
        $('#save-product-btn').prop('disabled', false).text('Guardar Producto');
      }
    });
  }
  
  // Event delegation para el botón "Editar"
  $(document).on('click', '.edit-product-btn', function(e) {
    e.preventDefault();
    const productId = $(this).data('id');
    
    // Mostrar spinner de carga mientras se obtienen los datos
    showLoading('Cargando datos del producto...');
    
    // Primero obtenemos los datos del producto
    $.ajax({
      url: `${window.API_BASE_URL}/productos/todos`,
      type: 'GET',
      success: function(products) {
        const product = products.find(p => p.idProducto == productId);
        
        if (product) {
          // Ocultar spinner de carga
          hideLoading();
          
          // Una vez que tenemos los datos, configuramos y mostramos el modal
          setupAndShowEditModal(product);
        } else {
          hideLoading();
          showToast('error', 'No se pudo encontrar el producto');
        }
      },
      error: function(xhr) {
        hideLoading();
        showToast('error', 'Error al cargar los datos del producto');
      }
    });
  });
  
  function setupAndShowEditModal(product) {
    // Guardar los datos originales para comparar luego
    window.originalProductData = { ...product };
    
    console.log('Datos del producto para editar:', product);
    console.log('URLs de imágenes disponibles:', product.imagenesUrl);
    
    // Cambiar título del modal
    $('#product-modal-title').text('Editar Producto');
    
    // Limpiar errores previos
    $('#product-form-error').hide();
    $('#product-form')[0].reset();
    
    // Establecer ID del producto
    $('#product-id').val(product.idProducto);
    
    // Llenar el formulario con los datos actuales
    $('#product-name').val(product.prodNombre || '');
    $('#product-description').val(product.prodDescripcion || '');
    $('#product-price').val(product.prodPrecio || '');
    $('#product-stock').val(product.prodStock || '0');
    $('#product-provider').val(product.prodProveedor || '');
    $('#product-category').val(product.idCategoria || '');
    
    // Llenar las imágenes
    $('#images-container').empty();
    
    if (product.imagenesUrl && product.imagenesUrl.length > 0) {
      console.log(`Encontradas ${product.imagenesUrl.length} imágenes para mostrar`);
      
      // Agregar cada imagen
      product.imagenesUrl.forEach((url, index) => {
        $('#images-container').append(`
          <div class="input-group mb-2">
            <span class="input-group-text"><i class="bi bi-image"></i></span>
            <input type="text" class="form-control image-url" value="${url}" placeholder="URL de la imagen">
            <button type="button" class="btn btn-outline-danger remove-image">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        `);
        console.log(`Agregado input para imagen ${index+1}: ${url}`);
      });
      
      // Llamar a updateImagePreviews después de un breve retraso para asegurar
      // que los elementos del DOM estén completamente cargados
      setTimeout(() => {
        updateImagePreviews();
      }, 100);
    } else {
      console.log('No se encontraron imágenes para este producto');
      
      // Si no hay imágenes, agregar un campo vacío
      $('#images-container').html(`
        <div class="input-group mb-2">
          <span class="input-group-text"><i class="bi bi-image"></i></span>
          <input type="text" class="form-control image-url" placeholder="URL de la imagen">
          <button type="button" class="btn btn-outline-danger remove-image" disabled>
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `);
      updateImagePreviews();
    }
    
    // Mostrar modal
    const productModal = new bootstrap.Modal(document.getElementById('product-modal'));
    productModal.show();
  }

  // Función para mostrar spinner de carga global
  function showLoading(message) {
    // Si no existe el div de carga global, crearlo
    if ($('#global-loading-overlay').length === 0) {
      $('body').append(`
        <div id="global-loading-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background-color:rgba(0,0,0,0.5); z-index:9999; display:flex; justify-content:center; align-items:center;">
          <div class="bg-white p-3 rounded shadow text-center">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mt-2 mb-0" id="global-loading-message">Cargando...</p>
          </div>
        </div>
      `);
    }
    
    // Establecer mensaje personalizado si se proporciona
    if (message) {
      $('#global-loading-message').text(message);
    }
    
    // Mostrar overlay de carga
    $('#global-loading-overlay').show();
  }

  // Función para ocultar spinner de carga global
  function hideLoading() {
    $('#global-loading-overlay').hide();
  }
  
  // Event delegation para el botón "Eliminar"
  $(document).on('click', '.delete-product-btn', function(e) {
    e.preventDefault();
    const productId = $(this).data('id');
    const productName = $(this).data('name');
    
    // Configurar el modal con los datos del producto
    $('#product-name-to-delete').text(`"${productName || 'seleccionado'}"`);
    
    // Guardar el ID del producto para usar en la confirmación
    $('#confirm-delete-product').data('product-id', productId);
    
    // Mostrar el modal
    const deleteModal = new bootstrap.Modal(document.getElementById('delete-product-modal'));
    deleteModal.show();
  });

  // Event listener para confirmar la eliminación desde el modal
  $(document).on('click', '#confirm-delete-product', function() {
    const productId = $(this).data('product-id');
    
    if (productId) {
      // Cerrar el modal
      bootstrap.Modal.getInstance(document.getElementById('delete-product-modal')).hide();
      
      // Proceder con la eliminación
      deleteProduct(productId);
    }
  });
  
  // Función para eliminar (desactivar) un producto
  function deleteProduct(productId) {
    // Mostrar spinner de carga global
    showLoading('Eliminando producto...');
    
    $.ajax({
      url: `${window.API_BASE_URL}/productos/${productId}`,
      type: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      success: function(response) {
        // Ocultar spinner
        hideLoading();
        
        // Mostrar mensaje de éxito
        showToast('success', response.mensaje || 'Producto desactivado correctamente');
        
        // Recargar la lista de productos para reflejar el cambio
        loadProducts();
      },
      error: function(xhr) {
        // Ocultar spinner
        hideLoading();
        
        let errorMsg = 'Error al eliminar el producto';
        if (xhr.responseJSON && xhr.responseJSON.mensaje) {
          errorMsg = xhr.responseJSON.mensaje;
        } else if (xhr.status === 403) {
          errorMsg = 'No tiene permisos para realizar esta acción';
        }
        
        showToast('error', errorMsg);
      }
    });
  }
});
