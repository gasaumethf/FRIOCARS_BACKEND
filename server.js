import express from 'express';

import cors from 'cors';

import dotenv from 'dotenv';


// 🔥 RUTAS

import authRoutes from './src/routes/authRoutes.js';

import productoRoutes from './src/routes/productoRoutes.js';

import ventaRoutes from './src/routes/ventaRoutes.js';


// 🔥 CONFIG

dotenv.config();


// 🔥 DEBUG VARIABLES RENDER

console.log("🔥 VARIABLES RENDER:");

console.log("DB_HOST:", process.env.DB_HOST);

console.log("DB_USER:", process.env.DB_USER);

console.log("DB_NAME:", process.env.DB_NAME);

console.log("DB_PORT:", process.env.DB_PORT);


// 🔥 APP

const app = express();


// 🔥 MIDDLEWARES

app.use(cors());

app.use(express.json());


// 🔥 RUTAS API

app.use('/api/auth', authRoutes);

app.use('/api/productos', productoRoutes);

// 🔥 ESTA FALTABA
app.use('/api/ventas', ventaRoutes);


// 🔥 RUTA PRINCIPAL

app.get('/', (req, res) => {

    res.send('🚗 Servidor Frío Cars funcionando correctamente');

});


// 🔥 SERVIDOR

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {

    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);

});