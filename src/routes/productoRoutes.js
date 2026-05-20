import express from 'express';

import {

    crear,
    listar,
    obtenerPorId,
    actualizar,
    eliminar

} from '../controllers/productoController.js';

const router = express.Router();


// 🔥 RUTAS

router.post('/', crear);

router.get('/', listar);

router.get('/:id', obtenerPorId);

router.put('/:id', actualizar);

router.delete('/:id', eliminar);


export default router;