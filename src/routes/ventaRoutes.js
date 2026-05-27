import express from 'express';

import pool from '../config/db.js';

const router = express.Router();


// ✅ REGISTRAR VENTA

router.post('/ventas', async (req, res) => {

    const { productos } = req.body;

   