// ══════════════════════════════════════════════════════
//  FRÍO CARS — catalogoRoutes.js
//  Registrar en server.js como:
//  app.use('/api/catalogo', catalogoRoutes)
// ══════════════════════════════════════════════════════

import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// ══════════════════════════════════════════════════════
//  GET /api/catalogo/marcas
//  Devuelve todas las marcas ordenadas alfabéticamente
// ══════════════════════════════════════════════════════
router.get('/marcas', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT id_marca, nombre
      FROM marca_vehiculo_catalogo
      ORDER BY nombre ASC
    `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo marcas:', error);
        res.status(500).json({ error: 'Error obteniendo marcas' });
    }
});

// ══════════════════════════════════════════════════════
//  GET /api/catalogo/modelos/:id_marca
//  Devuelve modelos de una marca específica
// ══════════════════════════════════════════════════════
router.get('/modelos/:id_marca', async (req, res) => {
    try {
        const { id_marca } = req.params;
        const result = await pool.query(`
      SELECT id_modelo, nombre
      FROM modelo_vehiculo_catalogo
      WHERE id_marca = $1
      ORDER BY nombre ASC
    `, [id_marca]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo modelos:', error);
        res.status(500).json({ error: 'Error obteniendo modelos' });
    }
});

// ══════════════════════════════════════════════════════
//  GET /api/catalogo/modelos/buscar?q=texto
//  Busca modelos en todas las marcas (para búsqueda libre)
// ══════════════════════════════════════════════════════
router.get('/modelos/buscar', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 1) return res.json([]);

        const result = await pool.query(`
      SELECT mo.id_modelo, mo.nombre, ma.nombre AS marca
      FROM modelo_vehiculo_catalogo mo
      JOIN marca_vehiculo_catalogo ma ON ma.id_marca = mo.id_marca
      WHERE mo.nombre ILIKE $1
      ORDER BY mo.nombre ASC
      LIMIT 15
    `, [`%${q.trim()}%`]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error buscando modelos:', error);
        res.status(500).json({ error: 'Error buscando modelos' });
    }
});

export default router;