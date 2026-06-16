import pool from '../config/db.js';


//  REGISTRAR VENTA

export const registrarVenta = async (productos) => {

    let total = 0;

    for(const producto of productos){

        // CALCULAR TOTAL

        total += producto.precio * producto.cantidad;


        //  DESCONTAR STOCK

        await pool.query(

            `
            UPDATE producto
            SET stock = stock - $1
            WHERE id_producto = $2
            `,

            [producto.cantidad, producto.id_producto]

        );

    }

    return {

        message: 'Venta registrada correctamente',

        total

    };

};