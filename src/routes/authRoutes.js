// ══════════════════════════════════════════════════════
//  FRÍO CARS — authRoutes.js  (v3 — con rutas admin)
// ══════════════════════════════════════════════════════

import express from 'express';
import {
    register,
    login,
    getPendientes,
    actualizarEstado
} from '../controllers/authController.js';

// Middleware simple para verificar token y rol admin
import jwt from 'jsonwebtoken';

const soloAdmin = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No autorizado' });
    }
    try {
        const payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
        if (payload.rol !== 'admin') {
            return res.status(403).json({ message: 'Solo administradores' });
        }
        req.usuario = payload;
        next();
    } catch {
        return res.status(401).json({ message: 'Token inválido o vencido' });
    }
};

const router = express.Router();

// Públicas
router.post('/register', register);
router.post('/login', login);

// Solo admin
router.get('/pendientes', soloAdmin, getPendientes);
router.patch('/usuarios/:id/estado', soloAdmin, actualizarEstado);

export default router;