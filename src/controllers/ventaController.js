import { registrarVenta } from '../models/ventaModel.js';


// ✅ CREAR VENTA

export const crearVenta = async (req, res) => {

    try{

        const { productos } = req.body;

        const venta = await registrarVenta(productos);

        res.json(venta);

    }catch(error){

        console.error(error);

        res.status(500).json({

            message: 'Error registrando venta'

        });

    }

};