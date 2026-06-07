// ══════════════════════════════════════════════════════
//  FRÍO CARS — clienteRoutes.js
//  Registrado en server.js como: app.use('/api/clientes', clienteRoutes)
//  Por eso las rutas aquí son '/' y '/:id' (sin /clientes)
// ══════════════════════════════════════════════════════

import express from 'express';
import pool    from '../config/db.js';

const router = express.Router();


// ══════════════════════════════════════════════════════
//  GET /api/clientes
// ══════════════════════════════════════════════════════
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM cliente
            ORDER BY id_cliente DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error obteniendo clientes" });
    }
});


// ══════════════════════════════════════════════════════
//  POST /api/clientes — con validación de duplicado
// ══════════════════════════════════════════════════════
router.post('/', async (req, res) => {
    try {
        const { numero_documento, nombre, apellido, telefono, correo, direccion } = req.body;

        // Validar campos obligatorios
        if (!nombre || !apellido || !numero_documento || !telefono) {
            return res.status(400).json({ error: "Nombre, apellido, documento y teléfono son obligatorios" });
        }

        // ✅ Validar duplicado por numero_documento
        const existe = await pool.query(
            `SELECT id_cliente FROM cliente WHERE numero_documento = $1`,
            [numero_documento]
        );
        if (existe.rows.length > 0) {
            return res.status(409).json({
                error: `Ya existe un cliente con el documento ${numero_documento}`
            });
        }

        const result = await pool.query(`
            INSERT INTO cliente (numero_documento, nombre, apellido, telefono, correo, direccion)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [numero_documento, nombre, apellido, telefono, correo || null, direccion || null]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error creando cliente" });
    }
});


// ══════════════════════════════════════════════════════
//  PUT /api/clientes/:id
// ══════════════════════════════════════════════════════
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { numero_documento, nombre, apellido, telefono, correo, direccion } = req.body;

        const result = await pool.query(`
            UPDATE cliente
            SET numero_documento = $1,
                nombre           = $2,
                apellido         = $3,
                telefono         = $4,
                correo           = $5,
                direccion        = $6
            WHERE id_cliente = $7
            RETURNING *
        `, [numero_documento, nombre, apellido, telefono, correo || null, direccion || null, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Cliente no encontrado" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error actualizando cliente" });
    }
});


// ══════════════════════════════════════════════════════
//  DELETE /api/clientes/:id
// ══════════════════════════════════════════════════════
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Primero eliminar vehículos asociados
        await pool.query(`DELETE FROM vehiculo WHERE id_cliente = $1`, [id]);

        await pool.query(`DELETE FROM cliente WHERE id_cliente = $1`, [id]);

        res.json({ mensaje: "Cliente eliminado correctamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error eliminando cliente" });
    }
});


export default router;