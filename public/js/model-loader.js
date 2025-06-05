document.addEventListener('DOMContentLoaded', function() {
  // Asegurar que el contenedor de la navbar esté completamente oculto
  const navbarContainer = document.getElementById('navbar-container');
  if (navbarContainer) {
    navbarContainer.classList.add('navbar-hidden');
  }
  
  // Cargar el contenido de la navbar pero mantenerla oculta
  if (window.loadNavbar && typeof window.loadNavbar === 'function') {
    window.loadNavbar();
  }
  
  // Crear el loader a pantalla completa
  const loader = document.createElement('div');
  loader.className = 'fullscreen-loader';
  
  // Agregar efecto de destello
  const shine = document.createElement('div');
  shine.className = 'loader-shine';
  loader.appendChild(shine);
  
  // Contenido del loader con texto más atractivo
  loader.innerHTML += `
    <div class="loader-logo">
      <i class="bi bi-motorcycle"></i>
    </div>
    <div class="loader-progress-container">
      <div class="loader-progress-bar" id="model-progress-bar"></div>
    </div>
    <div class="loader-text">Bienvenido a la Experiencia Motociclista</div>
    <div class="loader-subtext">Preparando tu aventura sobre ruedas...</div>
  `;
  
  // Agregar el loader al body
  document.body.appendChild(loader);
  
  // Ocultar inicialmente el modelo para la animación de entrada
  const modelContainer = document.querySelector('.model-viewer-container');
  if (modelContainer) {
    modelContainer.classList.add('model-hidden');
  }
  
  // Ocultar inicialmente los textos del hero
  const heroTitle = document.querySelector('.hero-title');
  const heroSubtitle = document.querySelector('.hero-subtitle');
  const heroButtons = document.querySelector('.hero-buttons');
  
  if (heroTitle) heroTitle.style.opacity = '0';
  if (heroSubtitle) heroSubtitle.style.opacity = '0';
  if (heroButtons) heroButtons.style.opacity = '0';
  
  // Obtener referencia al modelo 3D
  const modelViewer = document.querySelector('model-viewer');
  
  if (modelViewer) {
    // Obtener la barra de progreso
    const progressBar = document.getElementById('model-progress-bar');
    
    // Monitorear el progreso de carga
    modelViewer.addEventListener('progress', (event) => {
      const progress = event.detail.totalProgress * 100;
      progressBar.style.width = `${progress}%`;
      
      // Si el progreso es cercano al 100%, preparar para la animación final
      if (progress > 98) {
        progressBar.style.width = '100%';
      }
    });
    
    // Cuando el modelo esté completamente cargado
    modelViewer.addEventListener('load', () => {
      // Esperar un momento para asegurar que el modelo sea visible
      setTimeout(() => {
        // Ocultar el loader con animación
        loader.classList.add('loader-hidden');
        
        // Eliminar el loader y mostrar el modelo con animación cuando termine la transición del loader
        setTimeout(() => {
          loader.remove();
          
          // 1. PRIMERO: Mostrar el modelo con la animación de entrada
          if (modelContainer) {
            modelContainer.classList.remove('model-hidden');
            modelContainer.classList.add('model-entrance');
            
            // 2. SEGUNDO: Mostrar la navbar con animación después del modelo
            setTimeout(() => {
              if (navbarContainer) {
                // Eliminar la clase que oculta completamente el contenedor
                navbarContainer.classList.remove('navbar-hidden');
                // La animación navbarSlideDown se aplicará automáticamente a la navbar
              }
              
              // 3. TERCERO: Mostrar el texto "FEEL THE THUNDER"
              setTimeout(() => {
                // Animar los elementos de texto con una secuencia
                if (heroTitle) {
                  heroTitle.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
                  heroTitle.style.transform = 'translateY(30px)';
                  heroTitle.style.opacity = '1';
                  heroTitle.style.transform = 'translateY(0)';
                }
                
                setTimeout(() => {
                  if (heroSubtitle) {
                    heroSubtitle.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
                    heroSubtitle.style.transform = 'translateY(20px)';
                    heroSubtitle.style.opacity = '1';
                    heroSubtitle.style.transform = 'translateY(0)';
                  }
                }, 400);
                
                setTimeout(() => {
                  if (heroButtons) {
                    heroButtons.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
                    heroButtons.style.transform = 'translateY(20px)';
                    heroButtons.style.opacity = '1';
                    heroButtons.style.transform = 'translateY(0)';
                  }
                }, 800);
                
              }, 600); // Tiempo para que primero aparezca la navbar y luego el texto
            }, 400); // Tiempo para que primero aparezca el modelo y luego la navbar
          }
        }, 1000);
      }, 500);
    });
    
    // Si hay error o tarda demasiado, agregar un timeout de seguridad
    setTimeout(() => {
      if (!loader.classList.contains('loader-hidden')) {
        loader.classList.add('loader-hidden');
        setTimeout(() => {
          loader.remove();
          // Mostrar el modelo incluso si hubo un timeout
          if (modelContainer) {
            modelContainer.classList.remove('model-hidden');
            modelContainer.classList.add('model-entrance');
            
            // Mostrar la navbar en caso de timeout
            if (navbarContainer) {
              navbarContainer.style.display = 'block';
              
              const navbar = document.querySelector('.navbar');
              if (navbar) {
                navbar.style.opacity = '1';
                navbar.style.transform = 'translateY(0)';
              }
            }
            
            // Mostrar el texto también en caso de timeout
            if (heroTitle) heroTitle.style.opacity = '1';
            if (heroSubtitle) heroSubtitle.style.opacity = '1';
            if (heroButtons) heroButtons.style.opacity = '1';
          }
        }, 1000);
      }
    }, 15000); // 15 segundos máximo de espera
  } else {
    // Si no se encuentra el modelo, ocultar el loader inmediatamente
    loader.classList.add('loader-hidden');
    setTimeout(() => {
      loader.remove();
      
      // Mostrar la navbar aunque no haya modelo
      if (navbarContainer) {
        navbarContainer.style.display = 'block';
        
        const navbar = document.querySelector('.navbar');
        if (navbar) {
          navbar.style.opacity = '1';
          navbar.style.transform = 'translateY(0)';
        }
      }
      
      // Mostrar el texto aunque no haya modelo
      if (heroTitle) heroTitle.style.opacity = '1';
      if (heroSubtitle) heroSubtitle.style.opacity = '1';
      if (heroButtons) heroButtons.style.opacity = '1';
    }, 1500);
  }
});
