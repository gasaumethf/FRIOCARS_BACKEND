// ══════════════════════════════════════════════════════
//  FRÍO CARS — cotizacionRoutes.js
//  app.use('/api/cotizaciones', cotizacionRoutes)
// ══════════════════════════════════════════════════════

import express from 'express';
import pool    from '../config/db.js';

const router = express.Router();


// ══════════════════════════════════════════════════════
//  GET /api/cotizaciones — listar todas
// ══════════════════════════════════════════════════════
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id_cotizacion, fecha_cotizacion, descripcion,
                costo_estimado, estado, tipo,
                nombre_cliente, telefono, vehiculo_texto,
                diagnostico_ia, imagen_count
            FROM cotizacion
            ORDER BY fecha_cotizacion DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error obteniendo cotizaciones" });
    }
});


// ══════════════════════════════════════════════════════
//  GET /api/cotizaciones/:id — una cotización
// ══════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT * FROM cotizacion WHERE id_cotizacion = $1`,
            [id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Cotización no encontrada" });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error obteniendo cotización" });
    }
});


// ══════════════════════════════════════════════════════
//  POST /api/cotizaciones — crear cotización
// ══════════════════════════════════════════════════════
router.post('/', async (req, res) => {
    try {
        const {
            nombre_cliente, telefono, vehiculo_texto,
            descripcion, diagnostico_ia, costo_estimado,
            tipo, imagen_count
        } = req.body;

        const result = await pool.query(`
            INSERT INTO cotizacion
                (nombre_cliente, telefono, vehiculo_texto, descripcion,
                 diagnostico_ia, costo_estimado, estado, tipo, imagen_count)
            VALUES ($1,$2,$3,$4,$5,$6,'PENDIENTE',$7,$8)
            RETURNING *
        `, [
            nombre_cliente  || null,
            telefono        || null,
            vehiculo_texto  || null,
            descripcion     || null,
            diagnostico_ia  || null,
            costo_estimado  || 0,
            tipo            || 'AUTOMATICA',
            imagen_count    || 0
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error guardando cotización" });
    }
});


// ══════════════════════════════════════════════════════
//  PATCH /api/cotizaciones/:id/estado
// ══════════════════════════════════════════════════════
router.patch('/:id/estado', async (req, res) => {
    try {
        const { id }    = req.params;
        const { estado } = req.body;
        const result = await pool.query(
            `UPDATE cotizacion SET estado=$1 WHERE id_cotizacion=$2 RETURNING *`,
            [estado, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error actualizando estado" });
    }
});


// ══════════════════════════════════════════════════════
//  DELETE /api/cotizaciones/:id
// ══════════════════════════════════════════════════════
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(`DELETE FROM cotizacion WHERE id_cotizacion=$1`, [id]);
        res.json({ mensaje: "Cotización eliminada" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error eliminando cotización" });
    }
});


export default router;