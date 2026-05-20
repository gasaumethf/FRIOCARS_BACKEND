import pool from '../config/db.js';


// CREAR USUARIO

export const crearUsuario = async (

    username,
    password,
    nombre,
    apellido,
    correo

) => {

    const query = `

        INSERT INTO usuario
        (
            username,
            password,
            nombre,
            apellido,
            correo,
            estado
        )

        VALUES ($1,$2,$3,$4,$5,'ACTIVO')

        RETURNING *

    `;

    const values = [

        username,
        password,
        nombre,
        apellido,
        correo

    ];

    const result = await pool.query(query, values);

    return result.rows[0];

};


// BUSCAR USUARIO

export const buscarUsuario = async (username) => {

    const result = await pool.query(

        'SELECT * FROM usuario WHERE username = $1',

        [username]

    );

    return result.rows[0];

};