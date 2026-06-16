// ══════════════════════════════════════════════════════
//  FRÍO CARS — ordenRoutes.js
// ══════════════════════════════════════════════════════

import express from 'express';
import pool    from '../config/db.js';

const router = express.Router();


// ══════════════════════════════════════════════════════
//  GET /api/ordenes
// ══════════════════════════════════════════════════════
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                o.id_orden, o.tipo_servicio, o.descripcion, o.observaciones,
                o.estado, o.fecha_ingreso, o.fecha_fin,
                c.id_cliente, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido, c.telefono AS cliente_telefono,
                v.id_vehiculo, v.placa, v.marca, v.modelo, v.anio, v.tipo_vehiculo,
                t.id_tecnico, t.nombre AS tecnico_nombre, t.apellido AS tecnico_apellido, t.especialidad AS tecnico_especialidad
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
//  GET /api/ordenes/activas
// ══════════════════════════════════════════════════════
router.get('/activas', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                o.id_orden, o.tipo_servicio, o.descripcion, o.observaciones,
                o.estado, o.fecha_ingreso,
                c.id_cliente, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido, c.telefono AS cliente_telefono,
                v.id_vehiculo, v.placa, v.marca, v.modelo, v.anio, v.tipo_vehiculo,
                t.id_tecnico, t.nombre AS tecnico_nombre, t.apellido AS tecnico_apellido, t.especialidad AS tecnico_especialidad
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
//  POST /api/ordenes
// ══════════════════════════════════════════════════════
router.post('/', async (req, res) => {
    try {
        const { tipo_servicio, descripcion, id_cliente, id_vehiculo, id_tecnico } = req.body;

        if (!tipo_servicio || !id_cliente || !id_vehiculo) {
            return res.status(400).json({ error: "tipo_servicio, id_cliente e id_vehiculo son obligatorios" });
        }

        const result = await pool.query(`
            INSERT INTO orden_de_trabajo
                (tipo_servicio, descripcion, estado, fecha_ingreso, id_cliente, id_vehiculo, id_tecnico)
            VALUES ($1, $2, 'Activa', NOW(), $3, $4, $5)
            RETURNING *
        `, [tipo_servicio, descripcion || null, id_cliente, id_vehiculo, id_tecnico || null]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error creando orden" });
    }
});


// ══════════════════════════════════════════════════════
//  PUT /api/ordenes/:id
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

        if (result.rows.length === 0) return res.status(404).json({ error: "Orden no encontrada" });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error actualizando orden" });
    }
});


// ══════════════════════════════════════════════════════
//  PATCH /api/ordenes/:id/finalizar
// ══════════════════════════════════════════════════════
router.patch('/:id/finalizar', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            UPDATE orden_de_trabajo
            SET estado = 'Finalizada', fecha_fin = NOW()
            WHERE id_orden = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) return res.status(404).json({ error: "Orden no encontrada" });
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
        // Eliminar repuestos asociados primero
        await pool.query(`DELETE FROM orden_repuesto WHERE id_orden = $1`, [id]);
        await pool.query(`DELETE FROM orden_de_trabajo WHERE id_orden = $1`, [id]);
        res.json({ mensaje: "Orden eliminada correctamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error eliminando orden" });
    }
});


// ══════════════════════════════════════════════════════
//  GET /api/ordenes/:id/repuestos — repuestos de una orden
// ══════════════════════════════════════════════════════
router.get('/:id/repuestos', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT
                r.id_orden_repuesto,
                r.id_orden,
                r.id_producto,
                r.cantidad,
                r.precio_aplicado,
                r.subtotal,
                p.nombre   AS producto_nombre,
                p.categoria AS producto_categoria
            FROM orden_repuesto r
            JOIN producto p ON r.id_producto = p.id_producto
            WHERE r.id_orden = $1
            ORDER BY r.id_orden_repuesto ASC
        `, [id]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error obteniendo repuestos de la orden" });
    }
});


// ══════════════════════════════════════════════════════
//  POST /api/ordenes/:id/repuestos — agregar repuesto a orden
// ══════════════════════════════════════════════════════
router.post('/:id/repuestos', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id }           = req.params;
        const { id_producto, cantidad } = req.body;

        if (!id_producto || !cantidad || cantidad < 1) {
            return res.status(400).json({ error: "id_producto y cantidad son obligatorios" });
        }

        await client.query('BEGIN');

        // Verificar stock
        const stockRes = await client.query(
            `SELECT stock, nombre, precio FROM producto WHERE id_producto = $1`,
            [id_producto]
        );
        if (stockRes.rows.length === 0) throw new Error("Producto no encontrado");
        const prod = stockRes.rows[0];
        if (prod.stock < cantidad) throw new Error(`Stock insuficiente para "${prod.nombre}". Disponible: ${prod.stock}`);

        const precio_aplicado = prod.precio;
        const subtotal        = precio_aplicado * cantidad;

        // Verificar si ya existe el producto en esta orden
        const existe = await client.query(
            `SELECT id_orden_repuesto, cantidad FROM orden_repuesto WHERE id_orden = $1 AND id_producto = $2`,
            [id, id_producto]
        );

        let result;
        if (existe.rows.length > 0) {
            // Actualizar cantidad
            const nuevaCantidad = existe.rows[0].cantidad + cantidad;
            const nuevoSubtotal = precio_aplicado * nuevaCantidad;
            result = await client.query(`
                UPDATE orden_repuesto
                SET cantidad = $1, subtotal = $2
                WHERE id_orden_repuesto = $3
                RETURNING *
            `, [nuevaCantidad, nuevoSubtotal, existe.rows[0].id_orden_repuesto]);
        } else {
            // Insertar nuevo
            result = await client.query(`
                INSERT INTO orden_repuesto (id_orden, id_producto, cantidad, precio_aplicado, subtotal)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [id, id_producto, cantidad, precio_aplicado, subtotal]);
        }

        // Descontar stock
        await client.query(
            `UPDATE producto SET stock = stock - $1 WHERE id_producto = $2`,
            [cantidad, id_producto]
        );

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: error.message || "Error agregando repuesto" });
    } finally {
        client.release();
    }
});


// ══════════════════════════════════════════════════════
//  DELETE /api/ordenes/:id/repuestos/:rid — quitar repuesto
// ══════════════════════════════════════════════════════
router.delete('/:id/repuestos/:rid', async (req, res) => {
    const client = await pool.connect();
    try {
        const { rid } = req.params;

        // Recuperar para devolver stock
        const rep = await client.query(
            `SELECT id_producto, cantidad FROM orden_repuesto WHERE id_orden_repuesto = $1`,
            [rid]
        );
        if (rep.rows.length === 0) return res.status(404).json({ error: "Repuesto no encontrado" });

        await client.query('BEGIN');

        // Devolver stock
        await client.query(
            `UPDATE producto SET stock = stock + $1 WHERE id_producto = $2`,
            [rep.rows[0].cantidad, rep.rows[0].id_producto]
        );

        await client.query(`DELETE FROM orden_repuesto WHERE id_orden_repuesto = $1`, [rid]);

        await client.query('COMMIT');
        res.json({ mensaje: "Repuesto eliminado y stock devuelto" });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: "Error eliminando repuesto" });
    } finally {
        client.release();
    }
});


// ══════════════════════════════════════════════════════
//  GET /api/ordenes/:id/resumen — resumen para cobro al finalizar
// ══════════════════════════════════════════════════════
router.get('/:id/resumen', async (req, res) => {
    try {
        const { id } = req.params;

        const ordenRes = await pool.query(`
            SELECT
                o.id_orden, o.tipo_servicio, o.descripcion, o.observaciones, o.fecha_ingreso,
                c.nombre AS cliente_nombre, c.apellido AS cliente_apellido, c.telefono AS cliente_telefono,
                c.id_cliente,
                v.placa, v.marca, v.modelo, v.anio,
                t.nombre AS tecnico_nombre, t.apellido AS tecnico_apellido
            FROM orden_de_trabajo o
            LEFT JOIN cliente  c ON o.id_cliente  = c.id_cliente
            LEFT JOIN vehiculo v ON o.id_vehiculo = v.id_vehiculo
            LEFT JOIN tecnico  t ON o.id_tecnico  = t.id_tecnico
            WHERE o.id_orden = $1
        `, [id]);

        if (ordenRes.rows.length === 0) return res.status(404).json({ error: "Orden no encontrada" });

        const repuestosRes = await pool.query(`
            SELECT
                r.id_orden_repuesto, r.id_producto, r.cantidad, r.precio_aplicado, r.subtotal,
                p.nombre AS producto_nombre
            FROM orden_repuesto r
            JOIN producto p ON r.id_producto = p.id_producto
            WHERE r.id_orden = $1
        `, [id]);

        const totalRepuestos = repuestosRes.rows.reduce((s, r) => s + parseFloat(r.subtotal), 0);

        res.json({
            orden:           ordenRes.rows[0],
            repuestos:       repuestosRes.rows,
            totalRepuestos,
            iva:             totalRepuestos * 0.19,
            totalConIva:     totalRepuestos * 1.19
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error obteniendo resumen" });
    }
});


export default router;