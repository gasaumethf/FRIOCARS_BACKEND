// ══════════════════════════════════════════════════════
//  FRÍO CARS — cotizacionRoutes.js
//  app.use('/api/cotizaciones', cotizacionRoutes)
// ══════════════════════════════════════════════════════

import express from 'express';
import pool    from '../config/db.js';

const router = express.Router();


// ══════════════════════════════════════════════════════
//  GET /api/cotizaciones — listar todas
// ══════════════════════════════════════════════════════
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id_cotizacion, fecha_cotizacion, descripcion,
                costo_estimado, estado, tipo,
                nombre_cliente, telefono, vehiculo_texto,
                diagnostico_ia, imagen_count
            FROM cotizacion
            ORDER BY fecha_cotizacion DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error obteniendo cotizaciones" });
    }
});


// ══════════════════════════════════════════════════════
//  GET /api/cotizaciones/:id — una cotización
// ══════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT * FROM cotizacion WHERE id_cotizacion = $1`,
            [id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Cotización no encontrada" });
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error obteniendo cotización" });
    }
});


// ══════════════════════════════════════════════════════
//  POST /api/cotizaciones — crear cotización
// ══════════════════════════════════════════════════════
router.post('/', async (req, res) => {
    try {
        const {
            nombre_cliente, telefono, vehiculo_texto,
            descripcion, diagnostico_ia, costo_estimado,
            tipo, imagen_count
        } = req.body;

        const result = await pool.query(`
            INSERT INTO cotizacion
                (nombre_cliente, telefono, vehiculo_texto, descripcion,
                 diagnostico_ia, costo_estimado, estado, tipo, imagen_count)
            VALUES ($1,$2,$3,$4,$5,$6,'PENDIENTE',$7,$8)
            RETURNING *
        `, [
            nombre_cliente  || null,
            telefono        || null,
            vehiculo_texto  || null,
            descripcion     || null,
            diagnostico_ia  || null,
            costo_estimado  || 0,
            tipo            || 'AUTOMATICA',
            imagen_count    || 0
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error guardando cotización" });
    }
});


// ══════════════════════════════════════════════════════
//  PATCH /api/cotizaciones/:id/estado
// ══════════════════════════════════════════════════════
router.patch('/:id/estado', async (req, res) => {
    try {
        const { id }    = req.params;
        const { estado } = req.body;
        const result = await pool.query(
            `UPDATE cotizacion SET estado=$1 WHERE id_cotizacion=$2 RETURNING *`,
            [estado, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error actualizando estado" });
    }
});


// ══════════════════════════════════════════════════════
//  DELETE /api/cotizaciones/:id
// ══════════════════════════════════════════════════════
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(`DELETE FROM cotizacion WHERE id_cotizacion=$1`, [id]);
        res.json({ mensaje: "Cotización eliminada" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error eliminando cotización" });
    }
});



// ══════════════════════════════════════════════════════
// POST /api/cotizaciones/diagnostico
// ══════════════════════════════════════════════════════

router.post('/diagnostico', async (req, res) => {
    try {

        const {
            nombre,
            telefono,
            vehiculo,
            descripcion,
            imagenes = []
        } = req.body;

        const prompt = `
Eres un técnico experto en aire acondicionado automotriz de Frío Cars.

Cliente: ${nombre}
Teléfono: ${telefono}
Vehículo: ${vehiculo}

Problema reportado:
${descripcion}

Cantidad de imágenes recibidas: ${imagenes.length}

Genera:

DIAGNÓSTICO
SERVICIOS NECESARIOS
REPUESTOS PROBABLES
COSTO ESTIMADO EN COP
GRAVEDAD (BAJA, MEDIA o ALTA)

Responde en español.
`;

        const response = await fetch(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        {
                            role: 'system',
                            content: 'Eres un especialista automotriz.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.4,
                    max_tokens: 1000
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            return res.status(500).json(data);
        }

        res.json({
            diagnostico:
                data.choices?.[0]?.message?.content ||
                'No se pudo generar diagnóstico'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: error.message
        });
    }
});





router.post('/diagnostico', async (req, res) => {
    try {

        const { messages } = req.body;

        const textoUsuario =
            messages?.[0]?.content
                ?.filter(x => x.type === 'text')
                ?.map(x => x.text)
                ?.join('\n') || '';

        const diagnostico = `
 DIAGNÓSTICO

Según la información suministrada por el cliente, se detecta una posible falla en el sistema de aire acondicionado automotriz.

 SERVICIOS NECESARIOS

• Revisión general del sistema
• Verificación de fugas
• Diagnóstico electrónico
• Comprobación de presión del gas refrigerante

 REPUESTOS PROBABLES

• Filtro secador
• Refrigerante
• Mangueras del sistema

 COSTO ESTIMADO: $350.000 - $850.000 COP

 URGENCIA: MEDIA

Se recomienda inspección técnica para confirmar el diagnóstico.

Descripción recibida:
${textoUsuario}
`;

        res.json({
            content: [
                {
                    text: diagnostico
                }
            ]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: error.message
        });
    }
});


export default router;