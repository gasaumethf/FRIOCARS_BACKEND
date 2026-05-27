import express from 'express';
import pool from '../config/db.js';

const router = express.Router();


// 🔥 GUARDAR VENTA

router.post('/', async (req, res) => {

    const { productos } = req.body;

    try {

        // ✅ VALIDAR CARRITO

        if (!productos || productos.length === 0) {

            return res.status(400).json({
                error: "No hay productos en la venta"
            });

        }

        // ✅ CREAR VENTA

        const ventaResult = await pool.query(

            `
            INSERT INTO venta (total, id_usuario)
            VALUES ($1, $2)
            RETURNING *;
            `,

            [0, 1]

        );

        const venta = ventaResult.rows[0];

        const idVenta = venta.id_venta;

        let total = 0;


        // ✅ RECORRER PRODUCTOS

        for (const p of productos) {

            const subtotal = p.precio * p.cantidad;

            total += subtotal;


            // ✅ INSERTAR DETALLE_COMPRA

            await pool.query(

                `
                INSERT INTO detalle_compra
                (
                    id_compra,
                    id_repuesto,
                    cantidad,
                    precio_unitario,
                )
                VALUES ($1, $2, $3, $4)
                `,

                [
                    idVenta,
                    p.id_producto,
                    p.cantidad,
                    p.precio,
            
                ]

            );


            // ✅ DESCONTAR STOCK

            await pool.query(

                `
                UPDATE producto
                SET stock = stock - $1
                WHERE id_producto = $2
                `,

                [
                    p.cantidad,
                    p.id_producto
                ]

            );

        }


        // ✅ ACTUALIZAR TOTAL

        await pool.query(

            `
            UPDATE venta
            SET total = $1
            WHERE id_venta = $2
            `,

            [
                total,
                idVenta
            ]

        );


        // ✅ RESPUESTA

        res.json({

            message: "Venta guardada correctamente",

            ventaId: idVenta,

            total

        });

    } catch (error) {

        console.error("ERROR EN VENTA:", error);

        res.status(500).json({

            error: "Error guardando venta"

        });

    }

});

export default router;