// ══════════════════════════════════════════════════════
//  FRÍO CARS — authController.js  (v3 — roles + pendiente)
// ══════════════════════════════════════════════════════

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
    crearUsuario,
    buscarUsuario,
    listarPendientes,
    actualizarEstadoUsuario
} from '../models/usuarioModel.js';


// ══════════════════════════════════════════════════════
//  REGISTER — queda PENDIENTE hasta que admin apruebe
// ══════════════════════════════════════════════════════

export const register = async (req, res) => {

    try {

        const { username, password, nombre, apellido, correo, rol } = req.body;

        // Validar duplicado
        const existe = await buscarUsuario(username);
        if (existe) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        // Rol válido — nunca confiar en el cliente para admin
        const rolesPermitidos = ['trabajador', 'cliente'];
        const rolFinal = rolesPermitidos.includes(rol) ? rol : 'cliente';

        // Encriptar
        const passwordHash = await bcrypt.hash(password, 10);

        // Crear con estado PENDIENTE
        const usuario = await crearUsuario(
            username,
            passwordHash,
            nombre,
            apellido,
            correo,
            rolFinal,
            'PENDIENTE'     // ← estado inicial
        );

        const { password: _, ...usuarioSinPassword } = usuario;

        res.status(201).json({
            message: 'Registro enviado. Un administrador revisará tu solicitud pronto.',
            usuario: usuarioSinPassword
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error del servidor' });
    }

};


// ══════════════════════════════════════════════════════
//  LOGIN — bloquea si estado != ACTIVO
// ══════════════════════════════════════════════════════

export const login = async (req, res) => {

    try {

        const { username, password } = req.body;

        const usuario = await buscarUsuario(username);

        if (!usuario) {
            return res.status(400).json({ message: 'Usuario no encontrado' });
        }

        // ── Verificar estado ANTES de la contraseña ──
        if (usuario.estado === 'PENDIENTE') {
            return res.status(403).json({
                message: 'Tu cuenta está pendiente de aprobación. El administrador te notificará pronto.'
            });
        }

        if (usuario.estado === 'RECHAZADO') {
            return res.status(403).json({
                message: 'Tu solicitud de registro fue rechazada. Contacta al administrador.'
            });
        }

        if (usuario.estado !== 'ACTIVO') {
            return res.status(403).json({ message: 'Cuenta inactiva. Contacta al administrador.' });
        }

        // Verificar contraseña
        const passwordCorrecta = await bcrypt.compare(password, usuario.password);
        if (!passwordCorrecta) {
            return res.status(400).json({ message: 'Contraseña incorrecta' });
        }

        // Token con id y rol
        const token = jwt.sign(
            { id: usuario.id_usuario, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

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


// ══════════════════════════════════════════════════════
//  LISTAR PENDIENTES — solo admin
// ══════════════════════════════════════════════════════

export const getPendientes = async (req, res) => {
    try {
        const pendientes = await listarPendientes();
        res.json(pendientes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};


// ══════════════════════════════════════════════════════
//  APROBAR / RECHAZAR — solo admin
// ══════════════════════════════════════════════════════

export const actualizarEstado = async (req, res) => {
    try {

        const { id } = req.params;
        const { estado } = req.body;   // 'ACTIVO' o 'RECHAZADO'

        if (!['ACTIVO', 'RECHAZADO'].includes(estado)) {
            return res.status(400).json({ message: 'Estado inválido' });
        }

        const usuario = await actualizarEstadoUsuario(id, estado);

        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const accion = estado === 'ACTIVO' ? 'aprobado' : 'rechazado';
        res.json({ message: `Usuario ${accion} correctamente`, usuario });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};