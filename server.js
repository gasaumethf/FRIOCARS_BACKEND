// ══════════════════════════════════════════════════════
//  FRÍO CARS — server.js
// ══════════════════════════════════════════════════════

import express        from 'express';
import cors           from 'cors';
import dotenv         from 'dotenv';

// ── RUTAS ─────────────────────────────────────────────
import authRoutes     from './src/routes/authRoutes.js';
import productoRoutes from './src/routes/productoRoutes.js';
import ventaRoutes    from './src/routes/ventaRoutes.js';
import clienteRoutes  from './src/routes/clienteRoutes.js';
import vehiculoRoutes from './src/routes/vehiculoRoutes.js';
import asistenteRoutes from './src/routes/asistenteRoutes.js';
import tecnicoRoutes  from './src/routes/tecnicoRoutes.js';   // ← NUEVO
import ordenRoutes    from './src/routes/ordenRoutes.js';     // ← NUEVO
import cotizacionRoutes from './routes/cotizacionRoutes.js'; //COTIZACIONES 


// ── CONFIG ────────────────────────────────────────────
dotenv.config();

console.log("VARIABLES RENDER:");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_PORT:", process.env.DB_PORT);

// ── APP ───────────────────────────────────────────────
const app = express();

// ── MIDDLEWARES ───────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── RUTAS API ─────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/clientes',   clienteRoutes);    // GET POST PUT DELETE /api/clientes
app.use('/api/vehiculos',  vehiculoRoutes);   // GET POST PUT DELETE /api/vehiculos
app.use('/api/ventas',     ventaRoutes);      // GET POST /api/ventas
app.use('/api/productos',  productoRoutes);   // GET POST PUT DELETE /api/productos
app.use('/api/asistente',  asistenteRoutes);
app.use('/api/tecnicos',   tecnicoRoutes);    // GET POST PUT DELETE /api/tecnicos  ← NUEVO
app.use('/api/ordenes',    ordenRoutes);      // GET POST PUT PATCH DELETE /api/ordenes ← NUEVO
app.use('/api/cotizaciones', cotizacionRoutes) //COTIZACIONES 

// ── RUTA PRINCIPAL ────────────────────────────────────
app.get('/', (req, res) => {
    res.send('Servidor Frío Cars funcionando correctamente');
});

// ── SERVIDOR ──────────────────────────────────────────   
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});