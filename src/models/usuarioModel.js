// ══════════════════════════════════════════════════════
//  FRÍO CARS 
// ══════════════════════════════════════════════════════

import pool from '../config/db.js';

// CREAR USUARIO
export const crearUsuario = async (
    username,
    password,
    nombre,
    apellido,
    correo,
    rol = 'cliente',
    estado = 'PENDIENTE'
) => {
    const result = await pool.query(`
        INSERT INTO usuario
            (username, password, nombre, apellido, correo, rol, estado)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id_usuario, username, nombre, apellido, correo, rol, estado
    `, [username, password, nombre, apellido, correo, rol, estado]);

    return result.rows[0];
};

// BUSCAR USUARIO POR USERNAME
export const buscarUsuario = async (username) => {
    const result = await pool.query(
        'SELECT * FROM usuario WHERE username = $1',
        [username]
    );
    return result.rows[0];
};

// LISTAR PENDIENTES — usa fecha_creacion (nombre real de la columna)
export const listarPendientes = async () => {
    const result = await pool.query(`
        SELECT id_usuario, username, nombre, apellido, correo, rol, estado, fecha_creacion
        FROM usuario
        WHERE estado = 'PENDIENTE'
        ORDER BY fecha_creacion ASC
    `);
    return result.rows;
};

// APROBAR O RECHAZAR USUARIO
export const actualizarEstadoUsuario = async (id, estado) => {
    const result = await pool.query(`
        UPDATE usuario
        SET estado = $1
        WHERE id_usuario = $2
        RETURNING id_usuario, username, nombre, apellido, correo, rol, estado
    `, [estado, id]);
    return result.rows[0];
};