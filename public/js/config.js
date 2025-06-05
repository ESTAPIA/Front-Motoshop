// Exponemos la configuración global para los scripts del cliente
const API_BASE_URL = window.API_BASE_URL || 'https://backmotos.onrender.com/api';

// Función para manejar errores API comunes
function handleApiError(xhr, defaultMessage) {
  console.error('Error API:', xhr);
  let errorMessage = defaultMessage;
  
  if (xhr.status === 401) {
    // Token expirado
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/?redirect=' + window.location.pathname;
    return false;
  }
  
  if (xhr.responseJSON && xhr.responseJSON.mensaje) {
    errorMessage = xhr.responseJSON.mensaje;
  } else if (xhr.responseJSON && xhr.responseJSON.error) {
    errorMessage = xhr.responseJSON.error;
  }
  
  return errorMessage;
}

// Función para formatear precios
function formatPrice(price) {
  if (!price) return '0.00';
  return parseFloat(price).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Función para mostrar toast
function showGlobalToast(type, message) {
  const toastContainer = document.getElementById('toast-container') || createToastContainer();
  
  const toastElement = document.createElement('div');
  toastElement.className = `toast toast-${type} show`;
  toastElement.innerHTML = `
    <div class="toast-header">
      <strong class="me-auto">${type === 'success' ? 'Éxito' : 'Error'}</strong>
      <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
    </div>
    <div class="toast-body">
      ${message}
    </div>
  `;
  
  toastContainer.appendChild(toastElement);
  
  setTimeout(() => {
    toastElement.remove();
  }, 5000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
  document.body.appendChild(container);
  return container;
}

// Exponemos funciones globales
window.handleApiError = handleApiError;
window.formatPrice = formatPrice;
window.showGlobalToast = showGlobalToast;
