// ══════════════════════════════════════════════════════
//  FRÍO CARS — ventaRoutes.js
// ══════════════════════════════════════════════════════

import express from 'express';
import pool    from '../config/db.js';

const router = express.Router();


// ══════════════════════════════════════════════════════
//  POST /api/ventas — Guardar venta completa
// ══════════════════════════════════════════════════════
router.post('/', async (req, res) => {

    const { productos, id_cliente } = req.body;

    if (!productos || productos.length === 0) {
        return res.status(400).json({ error: "No hay productos en la venta" });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // ── Validar stock ─────────────────────────────
        for (const p of productos) {
            // Si viene desde una orden ya finalizada, el stock ya fue descontado
            if (p.desde_orden) continue;

            const stockRes = await client.query(
                `SELECT stock, nombre FROM producto WHERE id_producto = $1`,
                [p.id_producto]
            );
            if (stockRes.rows.length === 0) throw new Error(`Producto ID ${p.id_producto} no encontrado`);
            if (stockRes.rows[0].stock < p.cantidad) {
                throw new Error(`Stock insuficiente para "${stockRes.rows[0].nombre}". Disponible: ${stockRes.rows[0].stock}`);
            }
        }

        // ── Calcular total ────────────────────────────
        let total = 0;
        for (const p of productos) {
            total += p.precio * p.cantidad;
        }

        // ── Crear registro de venta ───────────────────
        const ventaResult = await client.query(
            `INSERT INTO venta (total, id_usuario)
             VALUES ($1, $2)
             RETURNING *`,
            [total, 1]
        );

        const idVenta = ventaResult.rows[0].id_venta;

        // ── Descontar stock solo de productos nuevos ──
        for (const p of productos) {
            if (!p.desde_orden) {
                await client.query(
                    `UPDATE producto SET stock = stock - $1 WHERE id_producto = $2`,
                    [p.cantidad, p.id_producto]
                );
            }
        }

        await client.query('COMMIT');

        res.json({
            message:   "Venta guardada correctamente",
            ventaId:   idVenta,
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
            SELECT id_venta, total, fec, id_usuario
            FROM venta
            ORDER BY id_venta DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error obteniendo ventas" });
    }
});


export default router;