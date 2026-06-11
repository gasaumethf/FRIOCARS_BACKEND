// ══════════════════════════════════════════════════════════
//  FRÍO CARS — asistenteRoutes.js
//  Ruta: app.use('/api/asistente', asistenteRoutes)
//  Endpoints:
//    GET  /api/asistente/contexto  → stock + stats para la IA
//    POST /api/asistente/cotizar   → cotización basada en productos
// ══════════════════════════════════════════════════════════

import express from 'express';
import pool    from '../config/db.js';

const router = express.Router();


// ══════════════════════════════════════════════════════════
//  GET /api/asistente/contexto
//  Devuelve todo el contexto que necesita la IA:
//  productos, stats de ventas, stock bajo
// ══════════════════════════════════════════════════════════
router.get('/contexto', async (req, res) => {
  try {
    // Todos los productos con stock
    const productos = await pool.query(`
      SELECT id_producto, nombre, categoria, precio, stock, descripcion
      FROM producto
      ORDER BY nombre ASC
    `);

    // Productos con stock bajo (menos de 5)
    const stockBajo = await pool.query(`
      SELECT nombre, stock, categoria
      FROM producto
      WHERE stock < 5
      ORDER BY stock ASC
    `);

    // Productos agotados
    const agotados = await pool.query(`
      SELECT nombre, categoria
      FROM producto
      WHERE stock = 0
    `);

    // Top 5 más vendidos (si hay detalle_compra)
    let topVendidos = [];
    try {
      const tvRes = await pool.query(`
        SELECT p.nombre, p.precio, SUM(dc.cantidad) as total_vendido
        FROM detalle_compra dc
        JOIN producto p ON p.id_producto = dc.id_repuesto
        GROUP BY p.id_producto, p.nombre, p.precio
        ORDER BY total_vendido DESC
        LIMIT 5
      `);
      topVendidos = tvRes.rows;
    } catch { /* tabla puede no existir aún */ }

    // Stats generales
    const stats = await pool.query(`
      SELECT
        COUNT(*)                                    AS total_productos,
        SUM(stock)                                  AS total_unidades,
        AVG(precio)::numeric(12,0)                  AS precio_promedio,
        MAX(precio)                                 AS precio_max,
        MIN(CASE WHEN precio > 0 THEN precio END)   AS precio_min
      FROM producto
    `);

    res.json({
      productos:    productos.rows,
      stockBajo:    stockBajo.rows,
      agotados:     agotados.rows,
      topVendidos,
      stats:        stats.rows[0],
      timestamp:    new Date().toISOString()
    });

  } catch (error) {
    console.error('Error contexto asistente:', error);
    res.status(500).json({ error: 'Error obteniendo contexto del inventario' });
  }
});


// ══════════════════════════════════════════════════════════
//  POST /api/asistente/cotizar
//  Body: { productos: [{nombre, cantidad}] }
//  Devuelve: cotización con subtotal, IVA y total
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
        `SELECT id_producto, nombre, precio, stock
         FROM producto
         WHERE LOWER(nombre) ILIKE LOWER($1)
         LIMIT 1`,
        [`%${item.nombre}%`]
      );

      if (result.rows.length === 0) {
        items.push({
          nombre:    item.nombre,
          cantidad:  item.cantidad,
          precio:    null,
          subtotal:  null,
          disponible: false,
          mensaje:   'Producto no encontrado en inventario'
        });
        continue;
      }

      const prod = result.rows[0];
      const cantidad = parseInt(item.cantidad) || 1;
      const disponible = prod.stock >= cantidad;
      const subtotalItem = prod.precio * cantidad;
      subtotal += subtotalItem;

      items.push({
        id_producto: prod.id_producto,
        nombre:      prod.nombre,
        cantidad,
        precio_unitario: prod.precio,
        subtotal:    subtotalItem,
        stock_actual: prod.stock,
        disponible,
        mensaje: disponible
          ? `Disponible (${prod.stock} en stock)`
          : `Stock insuficiente (solo ${prod.stock} disponibles)`
      });
    }

    const iva      = Math.round(subtotal * 0.19);
    const total    = subtotal + iva;

    res.json({
      items,
      subtotal,
      iva,
      total,
      moneda:    'COP',
      fecha:     new Date().toLocaleDateString('es-CO'),
      validez:   '72 horas',
      empresa:   'Frío Cars — Sistema Automotriz'
    });

  } catch (error) {
    console.error('Error cotización asistente:', error);
    res.status(500).json({ error: 'Error generando cotización' });
  }
});


export default router;