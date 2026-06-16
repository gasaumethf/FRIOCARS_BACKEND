// ══════════════════════════════════════════════════════
//  FRÍO CARS — ordenRoutes.js
//  Registrado en server.js como: app.use('/api/ordenes', ordenRoutes)
// ══════════════════════════════════════════════════════

import express from 'express';
import pool    from '../config/db.js';

const router = express.Router();


// ══════════════════════════════════════════════════════
//  GET /api/ordenes — todas las órdenes con joins
// ══════════════════════════════════════════════════════
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                o.id_orden,
                o.tipo_servicio,
                o.descripcion,
                o.estado,
                o.fecha_ingreso,
                o.fecha_fin,
                c.id_cliente,
                c.nombre        AS cliente_nombre,
                c.apellido      AS cliente_apellido,
                c.telefono      AS cliente_telefono,
                v.id_vehiculo,
                v.placa,
                v.marca,
                v.modelo,
                v.anio,
                v.tipo_vehiculo,
                t.id_tecnico,
                t.nombre        AS tecnico_nombre,
                t.apellido      AS tecnico_apellido,
                t.especialidad  AS tecnico_especialidad
            FROM orden_de_trabajo o
            LEFT JOIN cliente  c ON o.id_cliente  = c.id_cliente
            LEFT JOIN vehiculo v ON o.id_vehiculo = v.id_vehiculo
            LEFT JOIN tecnico  t ON o.id_tecnico  = t.id_tecnico
            ORDER BY o.fecha_ingreso DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error obteniendo órdenes" });
    }
});


// ══════════════════════════════════════════════════════
//  GET /api/ordenes/activas — solo órdenes activas
// ══════════════════════════════════════════════════════
router.get('/activas', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                o.id_orden,
                o.tipo_servicio,
                o.descripcion,
                o.observaciones,
                o.estado,
                o.fecha_ingreso,
                c.id_cliente,
                c.nombre        AS cliente_nombre,
                c.apellido      AS cliente_apellido,
                c.telefono      AS cliente_telefono,
                v.id_vehiculo,
                v.placa,
                v.marca,
                v.modelo,
                v.anio,
                v.tipo_vehiculo,
                t.id_tecnico,
                t.nombre        AS tecnico_nombre,
                t.apellido      AS tecnico_apellido,
                t.especialidad  AS tecnico_especialidad
            FROM orden_de_trabajo o
            LEFT JOIN cliente  c ON o.id_cliente  = c.id_cliente
            LEFT JOIN vehiculo v ON o.id_vehiculo = v.id_vehiculo
            LEFT JOIN tecnico  t ON o.id_tecnico  = t.id_tecnico
            WHERE o.estado = 'Activa'
            ORDER BY o.fecha_ingreso DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error obteniendo órdenes activas" });
    }
});


// ══════════════════════════════════════════════════════
//  POST /api/ordenes — crear nueva orden
// ══════════════════════════════════════════════════════
router.post('/', async (req, res) => {
    try {
        const { tipo_servicio, descripcion, id_cliente, id_vehiculo, id_tecnico } = req.body;

        if (!tipo_servicio || !id_cliente || !id_vehiculo) {
            return res.status(400).json({
                error: "tipo_servicio, id_cliente e id_vehiculo son obligatorios"
            });
        }

        const result = await pool.query(`
            INSERT INTO orden_de_trabajo
                (tipo_servicio, descripcion, estado, fecha_ingreso, id_cliente, id_vehiculo, id_tecnico)
            VALUES ($1, $2, 'Activa', NOW(), $3, $4, $5)
            RETURNING *
        `, [
            tipo_servicio,
            descripcion || null,
            id_cliente,
            id_vehiculo,
            id_tecnico || null
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error creando orden" });
    }
});


// ══════════════════════════════════════════════════════
//  PUT /api/ordenes/:id — actualizar orden
// ══════════════════════════════════════════════════════
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo_servicio, descripcion, observaciones, estado, id_tecnico } = req.body;

        const result = await pool.query(`
            UPDATE orden_de_trabajo
            SET tipo_servicio = $1,
                descripcion   = $2,
                observaciones = $3,
                estado        = $4,
                id_tecnico    = $5,
                fecha_fin     = CASE WHEN $4::varchar = 'Finalizada' THEN NOW() ELSE NULL END
            WHERE id_orden = $6
            RETURNING *
        `, [tipo_servicio, descripcion || null, observaciones || null, estado, id_tecnico || null, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Orden no encontrada" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error actualizando orden" });
    }
});


// ══════════════════════════════════════════════════════
//  PATCH /api/ordenes/:id/finalizar — finalizar orden
// ══════════════════════════════════════════════════════
router.patch('/:id/finalizar', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            UPDATE orden_de_trabajo
            SET estado    = 'Finalizada',
                fecha_fin = NOW()
            WHERE id_orden = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Orden no encontrada" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error finalizando orden" });
    }
});


// ══════════════════════════════════════════════════════
//  DELETE /api/ordenes/:id
// ══════════════════════════════════════════════════════
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(`DELETE FROM orden_de_trabajo WHERE id_orden = $1`, [id]);
        res.json({ mensaje: "Orden eliminada correctamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error eliminando orden" });
    }
});


export default router;