import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

router.post('/ventas', async (req, res) => {

    const { productos } = req.body;

    try {

        // 🔥 1. CREAR VENTA
        const venta = await pool.query(
            "INSERT INTO venta (total, id_usuario) VALUES ($1, $2) RETURNING *",
            [0, 1] // luego lo mejoramos
        );

        const idVenta = venta.rows[0].id_venta;

        let total = 0;

        // 🔥 2. GUARDAR DETALLE
        for (let p of productos) {

            const subtotal = p.precio * p.cantidad;
            total += subtotal;

            await pool.query(
                `INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario)
                 VALUES ($1, $2, $3, $4)`,
                [idVenta, p.id_producto, p.cantidad, p.precio]
            );

            // 🔥 3. DESCONTAR STOCK
            await pool.query(
                `UPDATE producto 
                 SET stock = stock - $1 
                 WHERE id_producto = $2`,
                [p.cantidad, p.id_producto]
            );
        }

        // 🔥 ACTUALIZAR TOTAL
        await pool.query(
            "UPDATE venta SET total = $1 WHERE id_venta = $2",
            [total, idVenta]
        );

        res.json({ message: "Venta guardada", total });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error guardando venta" });
    }

});

export default router;