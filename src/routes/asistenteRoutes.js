// ══════════════════════════════════════════════════════════
//  FRÍO CARS — asistenteRoutes.js — Groq (gratis)
// ══════════════════════════════════════════════════════════

import express from 'express';
import pool from '../config/db.js';
import { chatGroq } from '../services/groq.js';

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
//  Consultas a la BD según la pregunta
// ══════════════════════════════════════════════════════════
const PALABRAS_VACIAS = new Set([
  'cual', 'cuales', 'cuanto', 'cuantos', 'cuantas', 'tienen', 'tiene', 'tengo', 'hay', 'para',
  'productos', 'producto', 'precio', 'precios', 'stock', 'dame', 'quiero', 'necesito', 'sobre',
  'como', 'donde', 'esta', 'estan', 'disponible', 'disponibles', 'inventario', 'unidades',
  'cotiza', 'cotizar', 'cotizacion', 'carro', 'tienda', 'tiendas', 'favor', 'todos', 'todas',
  'mas', 'menos', 'caros', 'baratos', 'bajo', 'agotados', 'resumen', 'con', 'los', 'las', 'del',
]);

function normalizar(txt) {
  return txt.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const fila = p =>
  `• ${p.nombre} | $${Number(p.precio).toLocaleString('es-CO')} | Stock: ${p.stock} | Cat: ${p.categoria || 'N/A'}`;

async function contextoBD(pregunta) {
  const q = normalizar(pregunta);
  const secciones = [];

  // Resumen general (siempre, es barato)
  const { rows: [stats] } = await pool.query(`
    SELECT COUNT(*) AS total_productos,
           COUNT(*) FILTER (WHERE stock > 0) AS con_stock,
           COUNT(*) FILTER (WHERE stock = 0) AS agotados,
           COUNT(*) FILTER (WHERE stock > 0 AND stock < 5) AS stock_bajo,
           COALESCE(SUM(stock), 0) AS total_unidades,
           COALESCE(SUM(stock * precio), 0)::numeric(14,0) AS valor_inventario
    FROM producto
  `);
  secciones.push(`RESUMEN DEL INVENTARIO:
Productos: ${stats.total_productos} | Con stock: ${stats.con_stock} | Agotados: ${stats.agotados} | Stock bajo (<5): ${stats.stock_bajo}
Unidades totales: ${stats.total_unidades} | Valor del inventario: $${Number(stats.valor_inventario).toLocaleString('es-CO')}`);

  const { rows: categorias } = await pool.query(`
    SELECT COALESCE(categoria, 'SIN CATEGORIA') AS categoria, COUNT(*) AS productos, COALESCE(SUM(stock), 0) AS unidades
    FROM producto GROUP BY 1 ORDER BY 1
  `);
  secciones.push('CATEGORÍAS:\n' + categorias.map(c => `• ${c.categoria}: ${c.productos} productos, ${c.unidades} uds`).join('\n'));

  if (/bajo|poco|agotad|reponer|pedir|falta|sin stock/.test(q)) {
    const { rows } = await pool.query(
      `SELECT nombre, categoria, precio, stock FROM producto WHERE stock < 5 ORDER BY stock ASC, nombre LIMIT 40`
    );
    secciones.push('PRODUCTOS CON STOCK BAJO O AGOTADOS (stock < 5):\n' + (rows.map(fila).join('\n') || 'Ninguno'));
  }

  if (/caro|costoso|mayor precio|mas alto/.test(q)) {
    const { rows } = await pool.query(
      `SELECT nombre, categoria, precio, stock FROM producto ORDER BY precio DESC LIMIT 15`
    );
    secciones.push('PRODUCTOS MÁS CAROS:\n' + rows.map(fila).join('\n'));
  }

  if (/barato|economico|menor precio|mas bajo/.test(q)) {
    const { rows } = await pool.query(
      `SELECT nombre, categoria, precio, stock FROM producto WHERE precio > 0 ORDER BY precio ASC LIMIT 15`
    );
    secciones.push('PRODUCTOS MÁS BARATOS:\n' + rows.map(fila).join('\n'));
  }

  if (/mas stock|mayor stock|mas unidades/.test(q)) {
    const { rows } = await pool.query(
      `SELECT nombre, categoria, precio, stock FROM producto ORDER BY stock DESC LIMIT 15`
    );
    secciones.push('PRODUCTOS CON MÁS STOCK:\n' + rows.map(fila).join('\n'));
  }

  // Búsqueda por palabras clave en nombre y categoría (sin tildes)
  const palabras = [...new Set(
    q.replace(/[^a-z0-9ñ\s-]/g, ' ').split(/\s+/)
      .filter(p => p.length > 2 && !PALABRAS_VACIAS.has(p))
  )].slice(0, 6);

  if (palabras.length > 0) {
    const condiciones = palabras
      .map((_, i) => `(TRANSLATE(LOWER(nombre), 'áéíóúü', 'aeiouu') LIKE $${i + 1}
                    OR TRANSLATE(LOWER(COALESCE(categoria, '')), 'áéíóúü', 'aeiouu') LIKE $${i + 1})`)
      .join(' OR ');
    const { rows } = await pool.query(
      `SELECT nombre, categoria, precio, stock FROM producto WHERE ${condiciones} ORDER BY stock DESC, nombre LIMIT 40`,
      palabras.map(p => `%${p}%`)
    );
    if (rows.length > 0) {
      secciones.push(`PRODUCTOS QUE COINCIDEN CON "${palabras.join(', ')}":\n` + rows.map(fila).join('\n'));
    } else {
      secciones.push(`No se encontraron productos que coincidan con "${palabras.join(', ')}".`);
    }
  }

  return secciones.join('\n\n');
}


// ══════════════════════════════════════════════════════════
//  POST /api/asistente/chat — Groq
// ══════════════════════════════════════════════════════════
router.post('/chat', async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'Falta configurar GROQ_API_KEY en el servidor.' });
    }

    const messages = (Array.isArray(req.body?.messages) ? req.body.messages : [])
      .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-12);

    if (messages.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un mensaje.' });
    }

    // Última pregunta del usuario
    const ultimaPregunta = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const datos = await contextoBD(ultimaPregunta);

    const systemPrompt = `Eres el asistente de Frío Cars, empresa colombiana de refrigeración y aire acondicionado automotriz.

DATOS REALES DE LA BASE DE DATOS (consultados ahora mismo):
${datos}

INSTRUCCIONES:
- Responde en español colombiano, claro y útil
- Usa SOLO los datos de arriba para stock, precios y cantidades; no inventes productos
- Si el producto exacto no está, dilo y sugiere el más parecido de la lista
- Para cotizaciones da desglose: subtotal, IVA 19% y total
- Indica el stock disponible
- Sé breve y directo`;

    const data = await chatGroq([{ role: 'system', content: systemPrompt }, ...messages]);

    if (data.error) {
      console.error('Error Groq:', data.error);
      return res.status(502).json({ error: data.error.message });
    }

    const texto = data.choices?.[0]?.message?.content || 'No pude procesar tu solicitud.';
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
    const items = [];
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
      const prod = result.rows[0];
      const cantidad = parseInt(item.cantidad) || 1;
      const disponible = prod.stock >= cantidad;
      const sub = prod.precio * cantidad;
      subtotal += sub;
      items.push({
        id_producto: prod.id_producto,
        nombre: prod.nombre,
        cantidad,
        precio_unitario: prod.precio,
        subtotal: sub,
        stock_actual: prod.stock,
        disponible,
        mensaje: disponible
          ? `Disponible (${prod.stock} en stock)`
          : `Stock insuficiente (solo ${prod.stock} disponibles)`
      });
    }

    const iva = Math.round(subtotal * 0.19);
    const total = subtotal + iva;

    res.json({
      items, subtotal, iva, total,
      moneda: 'COP',
      fecha: new Date().toLocaleDateString('es-CO'),
      validez: '72 horas',
      empresa: 'Frío Cars — Sistema Automotriz'
    });
  } catch (error) {
    console.error('Error cotizar:', error);
    res.status(500).json({ error: 'Error generando cotización' });
  }
});


export default router;