// ══════════════════════════════════════════════════════════
//  FRÍO CARS — asistenteRoutes.js
// ══════════════════════════════════════════════════════════

import express from 'express';
import pool    from '../config/db.js';

const router = express.Router();


// ══════════════════════════════════════════════════════════
//  GET /api/asistente/contexto
// ══════════════════════════════════════════════════════════
router.get('/contexto', async (req, res) => {
  try {
    const productos = await pool.query(`
      SELECT id_producto, nombre, categoria, precio, stock, descripcion
      FROM producto ORDER BY nombre ASC
    `);
    const stockBajo = await pool.query(`
      SELECT nombre, stock, categoria FROM producto WHERE stock < 5 ORDER BY stock ASC
    `);
    const agotados = await pool.query(`
      SELECT nombre, categoria FROM producto WHERE stock = 0
    `);
    const stats = await pool.query(`
      SELECT
        COUNT(*)                                  AS total_productos,
        SUM(stock)                                AS total_unidades,
        AVG(precio)::numeric(12,0)                AS precio_promedio,
        MAX(precio)                               AS precio_max,
        MIN(CASE WHEN precio > 0 THEN precio END) AS precio_min
      FROM producto
    `);
    res.json({
      productos:  productos.rows,
      stockBajo:  stockBajo.rows,
      agotados:   agotados.rows,
      stats:      stats.rows[0],
      timestamp:  new Date().toISOString()
    });
  } catch (error) {
    console.error('Error contexto asistente:', error);
    res.status(500).json({ error: 'Error obteniendo contexto del inventario' });
  }
});


// ══════════════════════════════════════════════════════════
//  POST /api/asistente/cotizar
// ══════════════════════════════════════════════════════════
router.post('/cotizar', async (req, res) => {
  try {
    const { productos: solicitud } = req.body;
    if (!solicitud || !Array.isArray(solicitud)) {
      return res.status(400).json({ error: 'Se requiere un array de productos' });
    }
    const items = [];
    let subtotal = 0;
    for (const item of solicitud) {
      const result = await pool.query(
        `SELECT id_producto, nombre, precio, stock FROM producto
         WHERE LOWER(nombre) ILIKE LOWER($1) LIMIT 1`,
        [`%${item.nombre}%`]
      );
      if (result.rows.length === 0) {
        items.push({ nombre: item.nombre, cantidad: item.cantidad, disponible: false, mensaje: 'Producto no encontrado' });
        continue;
      }
      const prod       = result.rows[0];
      const cantidad   = parseInt(item.cantidad) || 1;
      const disponible = prod.stock >= cantidad;
      const sub        = prod.precio * cantidad;
      subtotal        += sub;
      items.push({ id_producto: prod.id_producto, nombre: prod.nombre, cantidad, precio_unitario: prod.precio, subtotal: sub, stock_actual: prod.stock, disponible, mensaje: disponible ? `Disponible (${prod.stock} en stock)` : `Stock insuficiente (solo ${prod.stock} disponibles)` });
    }
    const iva   = Math.round(subtotal * 0.19);
    const total = subtotal + iva;
    res.json({ items, subtotal, iva, total, moneda: 'COP', fecha: new Date().toLocaleDateString('es-CO'), validez: '72 horas', empresa: 'Frío Cars — Sistema Automotriz' });
  } catch (error) {
    console.error('Error cotización asistente:', error);
    res.status(500).json({ error: 'Error generando cotización' });
  }
});


// ══════════════════════════════════════════════════════════
//  POST /api/asistente/chat — usa Claude (Anthropic)
// ══════════════════════════════════════════════════════════
router.post('/chat', async (req, res) => {
  try {
    const { messages, system } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 900,
        system,
        messages
      })
    });

    const data  = await response.json();
    const texto = data.content?.[0]?.text || 'No pude procesar tu solicitud.';

    res.json({ content: [{ type: 'text', text: texto }] });

  } catch (error) {
    console.error('Error Claude:', error);
    res.status(500).json({ error: 'Error conectando con Claude' });
  }
});


export default router;