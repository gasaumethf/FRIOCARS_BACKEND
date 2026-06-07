// ══════════════════════════════════════════════════════
//  FRÍO CARS — vehiculoRoutes.js
//  Tabla: vehiculo (id_vehiculo, placa, marca, modelo,
//                   tipo_vehiculo, anio, id_cliente)
// ══════════════════════════════════════════════════════

import express from 'express';
import pool    from '../config/db.js';

const router = express.Router();


// ══════════════════════════════════════════════════════
//  GET /api/vehiculos
//  Todos los vehículos (con datos del cliente)
// ══════════════════════════════════════════════════════
router.get('/vehiculos', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                v.*,
                c.nombre    AS cliente_nombre,
                c.apellido  AS cliente_apellido,
                c.telefono  AS cliente_telefono
            FROM vehiculo v
            LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
            ORDER BY v.id_vehiculo DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error obteniendo vehículos" });
    }
});


// ══════════════════════════════════════════════════════
//  GET /api/vehiculos/cliente/:id_cliente
//  Vehículos de un cliente específico
// ══════════════════════════════════════════════════════
router.get('/vehiculos/cliente/:id_cliente', async (req, res) => {
    try {
        const { id_cliente } = req.params;
        const result = await pool.query(`
            SELECT * FROM vehiculo
            WHERE id_cliente = $1
            ORDER BY id_vehiculo DESC
        `, [id_cliente]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error obteniendo vehículos del cliente" });
    }
});


// ══════════════════════════════════════════════════════
//  POST /api/vehiculos
//  Registrar vehículo (vinculado a un cliente)
// ══════════════════════════════════════════════════════
router.post('/vehiculos', async (req, res) => {
    try {
        const { placa, marca, modelo, tipo_vehiculo, anio, id_cliente } = req.body;

        // Validar que el cliente exista
        if (!id_cliente) {
            return res.status(400).json({ error: "id_cliente es obligatorio" });
        }

        // Verificar placa duplicada
        if (placa) {
            const existe = await pool.query(
                `SELECT id_vehiculo FROM vehiculo WHERE UPPER(placa) = UPPER($1)`,
                [placa]
            );
            if (existe.rows.length > 0) {
                return res.status(409).json({ error: `La placa ${placa} ya está registrada` });
            }
        }

        const result = await pool.query(`
            INSERT INTO vehiculo (placa, marca, modelo, tipo_vehiculo, anio, id_cliente)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [
            placa?.toUpperCase() || null,
            marca,
            modelo,
            tipo_vehiculo || null,
            anio ? parseInt(anio) : null,
            id_cliente
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error registrando vehículo" });
    }
});


// ══════════════════════════════════════════════════════
//  PUT /api/vehiculos/:id
//  Actualizar vehículo
// ══════════════════════════════════════════════════════
router.put('/vehiculos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { placa, marca, modelo, tipo_vehiculo, anio } = req.body;

        const result = await pool.query(`
            UPDATE vehiculo
            SET
                placa         = COALESCE($1, placa),
                marca         = COALESCE($2, marca),
                modelo        = COALESCE($3, modelo),
                tipo_vehiculo = COALESCE($4, tipo_vehiculo),
                anio          = COALESCE($5, anio)
            WHERE id_vehiculo = $6
            RETURNING *
        `, [
            placa?.toUpperCase() || null,
            marca || null,
            modelo || null,
            tipo_vehiculo || null,
            anio ? parseInt(anio) : null,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Vehículo no encontrado" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error actualizando vehículo" });
    }
});


// ══════════════════════════════════════════════════════
//  DELETE /api/vehiculos/:id
//  Eliminar vehículo
// ══════════════════════════════════════════════════════
router.delete('/vehiculos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(`DELETE FROM vehiculo WHERE id_vehiculo = $1`, [id]);
        res.json({ mensaje: "Vehículo eliminado" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error eliminando vehículo" });
    }
});


export default router;