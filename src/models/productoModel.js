import pool from '../config/db.js';

// 📦 CREAR PRODUCTO
export const crearProducto = async (producto) => {

    const { nombre, descripcion, precio, stock, categoria } = producto;

    const query = `
        INSERT INTO producto (nombre, descripcion, precio, stock, categoria)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;

    const values = [nombre, descripcion, precio, stock, categoria];

    const result = await pool.query(query, values);

    return result.rows[0];
};


// 📦 OBTENER TODOS LOS PRODUCTOS
export const obtenerProductos = async () => {

    const result = await pool.query('SELECT * FROM producto WHERE activo = true');

    return result.rows;
};


// 📦 OBTENER PRODUCTO POR ID
export const obtenerProductoPorId = async (id) => {

    const result = await pool.query(
        'SELECT * FROM producto WHERE id_producto = $1',
        [id]
    );

    return result.rows[0];
};


// 📦 ACTUALIZAR PRODUCTO
export const actualizarProducto = async (id, producto) => {

    const { nombre, descripcion, precio, stock, categoria } = producto;

    const query = `
        UPDATE producto
        SET nombre = $1,
            descripcion = $2,
            precio = $3,
            stock = $4,
            categoria = $5
        WHERE id_producto = $6
        RETURNING *;
    `;

    const values = [nombre, descripcion, precio, stock, categoria, id];

    const result = await pool.query(query, values);

    return result.rows[0];
};


// 📦 ELIMINAR (LÓGICO)
export const eliminarProducto = async (id) => {

    const result = await pool.query(
        'UPDATE producto SET activo = false WHERE id_producto = $1 RETURNING *',
        [id]
    );

    return result.rows[0];
};