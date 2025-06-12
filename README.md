# Front-Motoshop 🏍️

Frontend para una tienda de motocicletas desarrollado con Node.js, Express y EJS.

## 📋 Descripción

Este proyecto es un frontend completo para una tienda de motocicletas que incluye funcionalidades de:

- 🛒 Carrito de compras
- 📦 Catálogo de productos
- 💳 Sistema de checkout
- 📊 Panel de administración
- 👤 Gestión de usuarios
- 📄 Sistema de facturas
- 📋 Gestión de pedidos

## 🚀 Tecnologías Utilizadas

- **Backend**: Node.js, Express.js
- **Motor de Plantillas**: EJS (Embedded JavaScript)
- **Frontend**: HTML5, CSS3, JavaScript (jQuery)
- **Arquitectura**: MVC (Model-View-Controller)
- **HTTP Client**: Axios

## 📁 Estructura del Proyecto

```
├── app.js                 # Archivo principal de la aplicación
├── package.json          # Dependencias y scripts
├── config/               # Configuraciones
├── public/               # Archivos estáticos
│   ├── css/             # Estilos CSS
│   ├── js/              # JavaScript del frontend
│   ├── img/             # Imágenes
│   └── models/          # Modelos 3D
└── src/
    ├── controllers/     # Controladores MVC
    ├── models/          # Modelos de datos
    ├── routes/          # Rutas de la aplicación
    └── views/           # Plantillas EJS
        ├── admin/       # Vistas de administración
        ├── cart/        # Vistas del carrito
        ├── catalog/     # Vistas del catálogo
        ├── checkout/    # Vistas de checkout
        ├── facturas/    # Vistas de facturas
        ├── orders/      # Vistas de pedidos
        ├── users/       # Vistas de usuarios
        ├── layouts/     # Plantillas base
        └── partials/    # Componentes reutilizables
```

## 🛠️ Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/ESTAPIA/Front-Motoshop.git
   cd Front-Motoshop
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   - Crear un archivo `.env` basado en las configuraciones necesarias
   - Configurar las URLs de la API en `config/apiConfig.js`

4. **Ejecutar la aplicación**
   ```bash
   # Modo desarrollo
   npm run dev
   
   # Modo producción
   npm start
   ```

## 📱 Funcionalidades

### Para Usuarios
- ✅ Navegación por catálogo de motocicletas
- ✅ Visualización detallada de productos con modelos 3D
- ✅ Gestión de carrito de compras
- ✅ Proceso de checkout completo
- ✅ Perfil de usuario
- ✅ Historial de pedidos
- ✅ Gestión de facturas

### Para Administradores
- ✅ Dashboard administrativo
- ✅ Gestión de productos
- ✅ Gestión de usuarios
- ✅ Control de inventario
- ✅ Reportes de productos más vendidos
- ✅ Control de stock crítico
- ✅ Gestión de pedidos y facturas

## 🎨 Características del Frontend

- **Diseño Responsivo**: Compatible con dispositivos móviles y desktop
- **Interfaz Moderna**: UI limpia y fácil de usar
- **Modelos 3D**: Visualización interactiva de motocicletas
- **Navegación Intuitiva**: Experiencia de usuario optimizada
- **Animaciones Suaves**: Transiciones y efectos visuales

## 🔧 Scripts Disponibles

```bash
npm start      # Iniciar en producción
npm run dev    # Iniciar en desarrollo (con nodemon)
npm test       # Ejecutar tests (por configurar)
```

## 🚀 Despliegue

El proyecto está configurado para desplegarse en Vercel mediante el archivo `vercel.json`.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 👨‍💻 Desarrollador

Desarrollado por **Anthony Sosa** y **ESTAPIA** 

---

⭐ Si te gusta este proyecto, ¡dale una estrella en GitHub!
