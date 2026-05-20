import express from 'express';

import cors from 'cors';

import dotenv from 'dotenv';

// 🔥 RUTAS

import authRoutes from './src/routes/authRoutes.js';

import productoRoutes from './src/routes/productoRoutes.js';

dotenv.config();

const app = express();


// 🔥 MIDDLEWARES

app.use(cors());

app.use(express.json());


// 🔥 RUTAS API

app.use('/api/auth', authRoutes);

app.use('/api/productos', productoRoutes);


// 🔥 RUTA PRINCIPAL

app.get('/', (req, res) => {

    res.send('Servidor Frío Cars funcionando correctamente 🚗');

});


// 🔥 SERVIDOR

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {

    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);

});