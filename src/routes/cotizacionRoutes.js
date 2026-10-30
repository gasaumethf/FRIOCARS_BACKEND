// ══════════════════════════════════════════════════════
//  FRÍO CARS — cotizacionRoutes.js
//  app.use('/api/cotizaciones', cotizacionRoutes)
// ══════════════════════════════════════════════════════

import express from 'express';
import pool    from '../config/db.js';
import { chatGroq } from '../services/groq.js';

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

        // Precios reales de repuestos por categoría, para que el costo sea coherente con el inventario
        const { rows: categorias } = await pool.query(`
            SELECT COALESCE(categoria, 'OTROS') AS categoria,
                   MIN(precio) FILTER (WHERE precio > 0)::numeric(12,0) AS minimo,
                   MAX(precio)::numeric(12,0) AS maximo,
                   COUNT(*) FILTER (WHERE stock > 0) AS con_stock
            FROM producto GROUP BY 1 ORDER BY 1
        `);
        const preciosTexto = categorias
            .map(c => `• ${c.categoria}: $${Number(c.minimo || 0).toLocaleString('es-CO')} - $${Number(c.maximo || 0).toLocaleString('es-CO')} (${c.con_stock} con stock)`)
            .join('\n');

        const prompt = `
Cliente: ${nombre}
Teléfono: ${telefono || 'N/A'}
Vehículo: ${vehiculo}

Problema reportado:
${descripcion}

Cantidad de imágenes recibidas: ${imagenes.length}

PRECIOS DE REPUESTOS EN NUESTRO INVENTARIO (rango por categoría, COP):
${preciosTexto}

Genera estas secciones:

DIAGNÓSTICO
SERVICIOS NECESARIOS
REPUESTOS PROBABLES
COSTO ESTIMADO: escríbelo exactamente con el formato "$350.000 - $850.000 COP" (repuestos + mano de obra)
URGENCIA: BAJA, MEDIA o ALTA

Responde en español colombiano.
`;

        const data = await chatGroq([
            {
                role: 'system',
                content: 'Eres un técnico experto en aire acondicionado y refrigeración automotriz de Frío Cars (Colombia).'
            },
            { role: 'user', content: prompt }
        ], { temperature: 0.4, max_tokens: 1000 });

        if (data.error) {
            console.error('Error Groq:', data.error);
            return res.status(502).json({ error: data.error.message });
        }

        const diagnostico = data.choices?.[0]?.message?.content;
        if (!diagnostico) {
            return res.status(502).json({ error: 'La IA no devolvió un diagnóstico' });
        }

        res.json({ diagnostico });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: error.message
        });
    }
});


export default router;