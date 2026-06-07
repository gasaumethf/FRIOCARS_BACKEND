// ══════════════════════════════════════════════════════
//  FRÍO CARS — ventaRoutes.js
//  BUG CORREGIDO: coma extra en INSERT detalle_compra
//  MEJORADO: acepta id_cliente, valida stock previo
// ══════════════════════════════════════════════════════

import express from 'express';
import pool    from '../config/db.js';

const router = express.Router();


// ══════════════════════════════════════════════════════
//  POST /api/ventas — Guardar venta completa
// ══════════════════════════════════════════════════════
router.post('/', async (req, res) => {

    const { productos, id_cliente } = req.body;

    // ── Validar carrito ───────────────────────────────
    if (!productos || productos.length === 0) {
        return res.status(400).json({ error: "No hay productos en la venta" });
    }

    const client = await pool.connect(); // Usamos transacción

    try {
        await client.query('BEGIN');

        // ── Validar stock antes de procesar ──────────
        for (const p of productos) {
            const stockRes = await client.query(
                `SELECT stock, nombre FROM producto WHERE id_producto = $1`,
                [p.id_producto]
            );
            if (stockRes.rows.length === 0) {
                throw new Error(`Producto ID ${p.id_producto} no encontrado`);
            }
            const stockActual = stockRes.rows[0].stock;
            if (stockActual < p.cantidad) {
                throw new Error(
                    `Stock insuficiente para "${stockRes.rows[0].nombre}". Disponible: ${stockActual}, solicitado: ${p.cantidad}`
                );
            }
        }

        // ── Crear registro de venta ───────────────────
        const ventaResult = await client.query(
            `INSERT INTO venta (total, id_usuario)
             VALUES ($1, $2)
             RETURNING *`,
            [0, 1]  // id_usuario = 1 por ahora (se conecta al auth después)
        );

        const idVenta = ventaResult.rows[0].id_venta;
        let total = 0;

        // ── Insertar detalle y descontar stock ────────
        for (const p of productos) {
            const subtotal = p.precio * p.cantidad;
            total += subtotal;

            // ✅ BUG CORREGIDO: sin coma extra antes del paréntesis
            await client.query(
                `INSERT INTO detalle_compra
                 (id_compra, id_repuesto, cantidad, precio_unitario)
                 VALUES ($1, $2, $3, $4)`,
                [idVenta, p.id_producto, p.cantidad, p.precio]
            );

            // Descontar stock
            await client.query(
                `UPDATE producto
                 SET stock = stock - $1
                 WHERE id_producto = $2`,
                [p.cantidad, p.id_producto]
            );
        }

        // ── Actualizar total en la venta ──────────────
        await client.query(
            `UPDATE venta SET total = $1 WHERE id_venta = $2`,
            [total, idVenta]
        );

        await client.query('COMMIT');

        res.json({
            message:  "Venta guardada correctamente",
            ventaId:  idVenta,
            total,
            productos: productos.length
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("ERROR EN VENTA:", error.message);
        res.status(500).json({ error: error.message || "Error guardando venta" });

    } finally {
        client.release();
    }
});


// ══════════════════════════════════════════════════════
//  GET /api/ventas — Listar ventas
// ══════════════════════════════════════════════════════
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                v.id_venta,
                v.total,
                v.id_usuario,
                COUNT(d.id_compra) AS productos
            FROM venta v
            LEFT JOIN detalle_compra d ON d.id_compra = v.id_venta
            GROUP BY v.id_venta
            ORDER BY v.id_venta DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error obteniendo ventas" });
    }
});


export default router;