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
    const productos = await pool.query(
      `SELECT id_producto, nombre, categoria, precio, stock FROM producto ORDER BY nombre ASC`
    );
    const stats = await pool.query(`
      SELECT COUNT(*) AS total_productos, SUM(stock) AS total_unidades,
             AVG(precio)::numeric(12,0) AS precio_promedio,
             MAX(precio) AS precio_max,
             MIN(CASE WHEN precio > 0 THEN precio END) AS precio_min
      FROM producto
    `);
    res.json({ productos: productos.rows, stats: stats.rows[0] });
  } catch (error) {
    console.error('Error contexto:', error);
    res.status(500).json({ error: 'Error obteniendo contexto' });
  }
});


// ══════════════════════════════════════════════════════════
//  POST /api/asistente/chat
//  Busca productos relevantes en BD y consulta Claude
// ══════════════════════════════════════════════════════════
router.post('/chat', async (req, res) => {
  try {
    const { messages, system } = req.body;

    // Obtener la última pregunta del usuario
    const ultimaPregunta = messages[messages.length - 1]?.content || '';

    // Buscar productos relevantes en la BD según palabras clave
    const palabras = ultimaPregunta
      .toLowerCase()
      .split(/\s+/)
      .filter(p => p.length > 3)
      .slice(0, 5);

    let productosRelevantes = [];

    if (palabras.length > 0) {
      const condiciones = palabras.map((_, i) => `LOWER(nombre) ILIKE $${i + 1}`).join(' OR ');
      const valores     = palabras.map(p => `%${p}%`);
      const resultado   = await pool.query(
        `SELECT nombre, categoria, precio, stock FROM producto WHERE ${condiciones} ORDER BY nombre LIMIT 20`,
        valores
      );
      productosRelevantes = resultado.rows;
    }

    // Si no encontró por palabras clave, traer los primeros 30
    if (productosRelevantes.length === 0) {
      const fallback = await pool.query(
        `SELECT nombre, categoria, precio, stock FROM producto WHERE stock > 0 ORDER BY nombre LIMIT 30`
      );
      productosRelevantes = fallback.rows;
    }

    // Construir contexto de inventario reducido
    const inventarioTexto = productosRelevantes.length > 0
      ? productosRelevantes.map(p =>
          `• ${p.nombre} | $${Number(p.precio).toLocaleString('es-CO')} | Stock: ${p.stock} | Cat: ${p.categoria || 'N/A'}`
        ).join('\n')
      : 'Sin productos encontrados para esta búsqueda.';

    // System prompt compacto con solo productos relevantes
    const systemFinal = `Eres el asistente de Frío Cars, empresa de refrigeración automotriz colombiana.

PRODUCTOS DISPONIBLES (relevantes para esta consulta):
${inventarioTexto}

REGLAS:
- Responde en español colombiano, breve y útil
- Cotizaciones incluyen IVA 19%
- Si no encuentras el producto exacto, sugiere el más parecido
- Indica stock disponible en tus respuestas`;

    // Llamar a Claude con contexto reducido
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5',
        max_tokens: 600,
        system:     systemFinal,
        messages
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Error Anthropic:', data.error);
      return res.status(500).json({ error: data.error.message });
    }

    const texto = data.content?.[0]?.text || 'No pude procesar tu solicitud.';
    res.json({ content: [{ type: 'text', text: texto }] });

  } catch (error) {
    console.error('Error chat:', error);
    res.status(500).json({ error: 'Error procesando solicitud' });
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
    const items  = [];
    let subtotal = 0;

    for (const item of solicitud) {
      const result = await pool.query(
        `SELECT id_producto, nombre, precio, stock FROM producto WHERE LOWER(nombre) ILIKE LOWER($1) LIMIT 1`,
        [`%${item.nombre}%`]
      );
      if (result.rows.length === 0) {
        items.push({ nombre: item.nombre, disponible: false, mensaje: 'Producto no encontrado' });
        continue;
      }
      const prod       = result.rows[0];
      const cantidad   = parseInt(item.cantidad) || 1;
      const disponible = prod.stock >= cantidad;
      const sub        = prod.precio * cantidad;
      subtotal        += sub;
      items.push({
        id_producto:     prod.id_producto,
        nombre:          prod.nombre,
        cantidad,
        precio_unitario: prod.precio,
        subtotal:        sub,
        stock_actual:    prod.stock,
        disponible,
        mensaje: disponible
          ? `Disponible (${prod.stock} en stock)`
          : `Stock insuficiente (solo ${prod.stock} disponibles)`
      });
    }

    const iva   = Math.round(subtotal * 0.19);
    const total = subtotal + iva;

    res.json({
      items, subtotal, iva, total,
      moneda:  'COP',
      fecha:   new Date().toLocaleDateString('es-CO'),
      validez: '72 horas',
      empresa: 'Frío Cars — Sistema Automotriz'
    });
  } catch (error) {
    console.error('Error cotizar:', error);
    res.status(500).json({ error: 'Error generando cotización' });
  }
});


export default router;