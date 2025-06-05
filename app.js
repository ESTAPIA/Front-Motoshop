const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Set up EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Prefix for partials to avoid long paths
app.use('/partials', (req, res, next) => {
  const name = req.path.replace(/^\//, '');        
  return res.render(`partials/${name}`);
});

// Import routes
const homeRoutes = require('./src/routes/homeRoutes');
const profileRoutes = require('./src/routes/profileRoutes');
const catalogRoutes = require('./src/routes/catalogRoutes');
const cartRoutes = require('./src/routes/cartRoutes');
const checkoutRoutes = require('./src/routes/checkoutRoutes'); 
const orderRoutes = require('./src/routes/orderRoutes');
const facturasRoutes = require('./src/routes/facturasRoutes');
const adminRoutes = require('./src/routes/adminRoutes'); // Añadir rutas de administración

// Use routes
app.use('/', homeRoutes);
app.use('/profile', profileRoutes);
app.use('/catalog', catalogRoutes);
app.use('/cart', cartRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/orders', orderRoutes);
app.use('/facturas', facturasRoutes);
app.use('/admin', adminRoutes); // Añadir prefijo 'admin' para todas las rutas de administración

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
