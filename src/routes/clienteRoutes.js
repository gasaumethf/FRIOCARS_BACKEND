import express from 'express';

import pool from '../config/db.js';

const router = express.Router();


// =============================
// LISTAR CLIENTES
// =============================

router.get('/clientes', async (req, res) => {

    try {

        const result = await pool.query(`
        
            SELECT *
            FROM cliente
            ORDER BY id_cliente DESC
        
        `);

        res.json(result.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({

            error: "Error obteniendo clientes"

        });

    }

});


// =============================
// CREAR CLIENTE
// =============================

router.post('/clientes', async (req, res) => {

    try {

        const {

            numero_documento,
            nombre,
            apellido,
            telefono,
            correo,
            direccion

        } = req.body;

        const result = await pool.query(`

            INSERT INTO cliente(

                numero_documento,
                nombre,
                apellido,
                telefono,
                correo,
                direccion

            )

            VALUES($1,$2,$3,$4,$5,$6)

            RETURNING *

        `, [

            numero_documento,
            nombre,
            apellido,
            telefono,
            correo,
            direccion

        ]);

        res.json(result.rows[0]);

    } catch (error) {

        console.error(error);

        res.status(500).json({

            error: "Error creando cliente"

        });

    }

});


// =============================
// ACTUALIZAR CLIENTE
// =============================

router.put('/clientes/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const {

            numero_documento,
            nombre,
            apellido,
            telefono,
            correo,
            direccion

        } = req.body;

        const result = await pool.query(`

            UPDATE cliente
            SET

                numero_documento = $1,
                nombre = $2,
                apellido = $3,
                telefono = $4,
                correo = $5,
                direccion = $6

            WHERE id_cliente = $7

            RETURNING *

        `, [

            numero_documento,
            nombre,
            apellido,
            telefono,
            correo,
            direccion,
            id

        ]);

        res.json(result.rows[0]);

    } catch (error) {

        console.error(error);

        res.status(500).json({

            error: "Error actualizando cliente"

        });

    }

});


// =============================
// ELIMINAR CLIENTE
// =============================

router.delete('/clientes/:id', async (req, res) => {

    try {

        const { id } = req.params;

        await pool.query(`

            DELETE FROM cliente
            WHERE id_cliente = $1

        `, [id]);

        res.json({

            mensaje: "Cliente eliminado"

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            error: "Error eliminando cliente"

        });

    }

});


export default router;