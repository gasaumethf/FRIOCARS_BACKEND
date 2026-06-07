import express from 'express';
import cors    from 'cors';
import dotenv  from 'dotenv';

// ══════════════════════════════════════════════════════
//  RUTAS
// ══════════════════════════════════════════════════════
import authRoutes     from './src/routes/authRoutes.js';
import productoRoutes from './src/routes/productoRoutes.js';
import ventaRoutes    from './src/routes/ventaRoutes.js';
import clienteRoutes  from './src/routes/clienteRoutes.js';
import vehiculoRoutes from './src/routes/vehiculoRoutes.js';

// ══════════════════════════════════════════════════════
//  CONFIG
// ══════════════════════════════════════════════════════
dotenv.config();

console.log("🔥 VARIABLES RENDER:");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_PORT:", process.env.DB_PORT);

// ══════════════════════════════════════════════════════
//  APP
// ══════════════════════════════════════════════════════
const app = express();

// ══════════════════════════════════════════════════════
//  MIDDLEWARES
// ══════════════════════════════════════════════════════
app.use(cors());
app.use(express.json());

// ══════════════════════════════════════════════════════
//  RUTAS API
// ══════════════════════════════════════════════════════
app.use('/api/auth',      authRoutes);
app.use('/api',           productoRoutes);   // GET /api/productos  POST /api/productos
app.use('/api',           ventaRoutes);      // GET /api/ventas     POST /api/ventas
app.use('/api',           clienteRoutes);    // GET /api/clientes   POST /api/clientes  PUT  DELETE
app.use('/api',           vehiculoRoutes);   // GET /api/vehiculos  POST /api/vehiculos PUT  DELETE

// ══════════════════════════════════════════════════════
//  RUTA PRINCIPAL
// ══════════════════════════════════════════════════════
app.get('/', (req, res) => {
    res.send('🚗 Servidor Frío Cars funcionando correctamente');
});

// ══════════════════════════════════════════════════════
//  SERVIDOR
// ══════════════════════════════════════════════════════
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});