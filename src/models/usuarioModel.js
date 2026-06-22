// ══════════════════════════════════════════════════════
//  FRÍO CARS — usuarioModel.js  (v2 — con rol)
// ══════════════════════════════════════════════════════

import pool from '../config/db.js';


// CREAR USUARIO

export const crearUsuario = async (

    username,
    password,
    nombre,
    apellido,
    correo,
    rol = 'cliente'         // ← nuevo parámetro, default cliente

) => {

    const query = `

        INSERT INTO usuario
        (
            username,
            password,
            nombre,
            apellido,
            correo,
            rol,
            estado
        )

        VALUES ($1,$2,$3,$4,$5,$6,'ACTIVO')

        RETURNING id_usuario, username, nombre, apellido, correo, rol, estado

    `;

    const values = [

        username,
        password,
        nombre,
        apellido,
        correo,
        rol

    ];

    const result = await pool.query(query, values);

    return result.rows[0];

};


// BUSCAR USUARIO (devuelve todos los campos incluido rol y password para comparar)

export const buscarUsuario = async (username) => {

    const result = await pool.query(

        'SELECT * FROM usuario WHERE username = $1',

        [username]

    );

    return result.rows[0];

};