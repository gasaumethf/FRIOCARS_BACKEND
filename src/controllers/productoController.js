import {
    crearProducto,
    obtenerProductos,
    obtenerProductoPorId,
    actualizarProducto,
    eliminarProducto
} from '../models/productoModel.js';


// ✅ CREAR
export const crear = async (req, res) => {
    try {
        const producto = await crearProducto(req.body);
        res.json(producto);
    } catch (error) {
        res.status(500).json({ message: 'Error creando producto' });
    }
};


// ✅ LISTAR
export const listar = async (req, res) => {
    try {
        const productos = await obtenerProductos();
        res.json(productos);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo productos' });
    }
};


// ✅ OBTENER POR ID
export const obtenerPorId = async (req, res) => {
    try {
        const producto = await obtenerProductoPorId(req.params.id);
        res.json(producto);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo producto' });
    }
};


// ✅ ACTUALIZAR
export const actualizar = async (req, res) => {
    try {
        const producto = await actualizarProducto(req.params.id, req.body);
        res.json(producto);
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando producto' });
    }
};


// ✅ ELIMINAR
export const eliminar = async (req, res) => {
    try {
        const producto = await eliminarProducto(req.params.id);
        res.json(producto);
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando producto' });
    }
};