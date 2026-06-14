// ══════════════════════════════════════════════════════
//  FRÍO CARS — tecnicoRoutes.js
//  Registrado en server.js como: app.use('/api/tecnicos', tecnicoRoutes)
// ══════════════════════════════════════════════════════

import express from 'express';
import pool    from '../config/db.js';

const router = express.Router();


// ══════════════════════════════════════════════════════
//  GET /api/tecnicos
// ══════════════════════════════════════════════════════
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM tecnico
            ORDER BY id_tecnico ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error obteniendo técnicos" });
    }
});


// ══════════════════════════════════════════════════════
//  POST /api/tecnicos
// ══════════════════════════════════════════════════════
router.post('/', async (req, res) => {
    try {
        const { nombre, apellido, telefono, especialidad, estado } = req.body;

        if (!nombre || !apellido) {
            return res.status(400).json({ error: "Nombre y apellido son obligatorios" });
        }

        const result = await pool.query(`
            INSERT INTO tecnico (nombre, apellido, telefono, especialidad, estado)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [nombre, apellido, telefono || null, especialidad || null, estado || 'Activo']);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error creando técnico" });
    }
});


// ══════════════════════════════════════════════════════
//  PUT /api/tecnicos/:id
// ══════════════════════════════════════════════════════
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, apellido, telefono, especialidad, estado } = req.body;

        const result = await pool.query(`
            UPDATE tecnico
            SET nombre       = $1,
                apellido     = $2,
                telefono     = $3,
                especialidad = $4,
                estado       = $5
            WHERE id_tecnico = $6
            RETURNING *
        `, [nombre, apellido, telefono || null, especialidad || null, estado || 'Activo', id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Técnico no encontrado" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error actualizando técnico" });
    }
});


// ══════════════════════════════════════════════════════
//  DELETE /api/tecnicos/:id
// ══════════════════════════════════════════════════════
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(`DELETE FROM tecnico WHERE id_tecnico = $1`, [id]);
        res.json({ mensaje: "Técnico eliminado correctamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error eliminando técnico" });
    }
});


export default router;