// ══════════════════════════════════════════════════════
//  FRÍO CARS — authController.js  (v4 — final)
//  cliente → ACTIVO directo
//  trabajador → PENDIENTE, admin aprueba
//  admin → solo otro admin crea desde panel
// ══════════════════════════════════════════════════════

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
    crearUsuario,
    buscarUsuario,
    listarPendientes,
    actualizarEstadoUsuario
} from '../models/usuarioModel.js';

// ── REGISTER (público) ────────────────────────────────
export const register = async (req, res) => {
    try {
        const { username, password, nombre, apellido, correo, rol } = req.body;

        const existe = await buscarUsuario(username);
        if (existe) return res.status(400).json({ message: 'El usuario ya existe' });

        // Solo cliente o trabajador desde registro público
        const rolFinal = rol === 'trabajador' ? 'trabajador' : 'cliente';

        // Cliente entra directo; trabajador queda pendiente
        const estadoFinal = rolFinal === 'cliente' ? 'ACTIVO' : 'PENDIENTE';

        const passwordHash = await bcrypt.hash(password, 10);
        const usuario = await crearUsuario(username, passwordHash, nombre, apellido, correo, rolFinal, estadoFinal);
        const { password: _, ...u } = usuario;

        // Si es cliente, devolver token para que entre directo
        if (rolFinal === 'cliente') {
            const token = jwt.sign({ id: u.id_usuario, rol: u.rol }, process.env.JWT_SECRET, { expiresIn: '8h' });
            return res.status(201).json({
                message: 'Cuenta creada exitosamente',
                usuario: u,
                token,
                acceso: true
            });
        }

        // Trabajador: sin token, queda pendiente
        res.status(201).json({
            message: 'Solicitud enviada. Un administrador aprobará tu cuenta pronto.',
            usuario: u,
            acceso: false
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// ── LOGIN ─────────────────────────────────────────────
export const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const usuario = await buscarUsuario(username);

        if (!usuario) return res.status(400).json({ message: 'Usuario no encontrado' });

        if (usuario.estado === 'PENDIENTE') return res.status(403).json({
            message: '⏳ Tu cuenta está pendiente de aprobación. El administrador te notificará pronto.'
        });
        if (usuario.estado === 'RECHAZADO') return res.status(403).json({
            message: '❌ Tu solicitud fue rechazada. Contacta al administrador.'
        });
        if (usuario.estado !== 'ACTIVO') return res.status(403).json({
            message: 'Cuenta inactiva. Contacta al administrador.'
        });

        const ok = await bcrypt.compare(password, usuario.password);
        if (!ok) return res.status(400).json({ message: 'Contraseña incorrecta' });

        const token = jwt.sign(
            { id: usuario.id_usuario, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        const { password: _, ...u } = usuario;
        res.json({ message: 'Login exitoso', usuario: u, token });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// ── LISTAR PENDIENTES (solo admin) ────────────────────
export const getPendientes = async (req, res) => {
    try {
        const pendientes = await listarPendientes();
        res.json(pendientes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// ── APROBAR / RECHAZAR (solo admin) ──────────────────
export const actualizarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        if (!['ACTIVO', 'RECHAZADO'].includes(estado))
            return res.status(400).json({ message: 'Estado inválido' });
        const usuario = await actualizarEstadoUsuario(id, estado);
        if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.json({ message: `Usuario ${estado === 'ACTIVO' ? 'aprobado' : 'rechazado'}`, usuario });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// ── CREAR ADMIN (solo admin) ──────────────────────────
export const crearAdmin = async (req, res) => {
    try {
        const { username, password, nombre, apellido, correo } = req.body;
        if (!username || !password || !nombre)
            return res.status(400).json({ message: 'Faltan campos requeridos' });

        const existe = await buscarUsuario(username);
        if (existe) return res.status(400).json({ message: 'El usuario ya existe' });

        const passwordHash = await bcrypt.hash(password, 10);
        const usuario = await crearUsuario(username, passwordHash, nombre, apellido || '', correo || '', 'admin', 'ACTIVO');
        const { password: _, ...u } = usuario;
        res.status(201).json({ message: 'Administrador creado correctamente', usuario: u });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};