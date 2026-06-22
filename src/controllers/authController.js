// ══════════════════════════════════════════════════════
//  FRÍO CARS — authController.js  (v2 — con rol en JWT)
// ══════════════════════════════════════════════════════

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { crearUsuario, buscarUsuario } from '../models/usuarioModel.js';


// ══════════════════════════════════════════════════════
//  REGISTER
// ══════════════════════════════════════════════════════

export const register = async (req, res) => {

    try {

        const {

            username,
            password,
            nombre,
            apellido,
            correo,
            rol         // ← aceptar rol desde el body (opcional)

        } = req.body;

        // VALIDAR DUPLICADO
        const usuarioExiste = await buscarUsuario(username);

        if (usuarioExiste) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        // ENCRIPTAR PASSWORD
        const passwordHash = await bcrypt.hash(password, 10);

        // CREAR (rol default = 'cliente' si no se manda)
        const rolFinal = ['admin', 'trabajador', 'cliente'].includes(rol) ? rol : 'cliente';

        const usuario = await crearUsuario(
            username,
            passwordHash,
            nombre,
            apellido,
            correo,
            rolFinal
        );

        // TOKEN — incluye id Y rol
        const token = jwt.sign(
            {
                id: usuario.id_usuario,
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Devolver usuario sin password
        const { password: _, ...usuarioSinPassword } = usuario;

        res.status(201).json({
            message: 'Usuario registrado correctamente',
            usuario: usuarioSinPassword,
            token
        });

    } catch (error) {

        console.error(error);
        res.status(500).json({ message: 'Error del servidor' });

    }

};


// ══════════════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════════════

export const login = async (req, res) => {

    try {

        const { username, password } = req.body;

        const usuario = await buscarUsuario(username);

        if (!usuario) {
            return res.status(400).json({ message: 'Usuario no encontrado' });
        }

        const passwordCorrecta = await bcrypt.compare(password, usuario.password);

        if (!passwordCorrecta) {
            return res.status(400).json({ message: 'Contraseña incorrecta' });
        }

        // TOKEN — incluye id Y rol
        const token = jwt.sign(
            {
                id: usuario.id_usuario,
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Devolver usuario sin password
        const { password: _, ...usuarioSinPassword } = usuario;

        res.json({
            message: 'Login exitoso',
            usuario: usuarioSinPassword,
            token
        });

    } catch (error) {

        console.error(error);
        res.status(500).json({ message: 'Error del servidor' });

    }

};