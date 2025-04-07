const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const secretKey = process.env.SECRET_KEY || "secreto_super_seguro";
const { connection } = require("../config/config.db"); 

const authMiddleware = (req, res, next) => {
  let token = req.header("Authorization");
  if (!token) {
    return res.status(401).json({ error: "Acceso denegado. No hay token." });
  }
  if (token.startsWith("Bearer ")) {
    token = token.slice(7).trim();
  }
  try {
    const decoded = jwt.verify(token, secretKey);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token no válido" });
  }
};

// Obtener todos los boletos (Solo Admin)
router.get('/boletos', authMiddleware, (req, res) => {
    if (!req.usuario.isAdmin) {
        return res.status(403).json({ error: 'Acceso denegado' });
    }

    const query = 'SELECT * FROM boletos';
    connection.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al obtener los boletos' });
        res.status(200).json(results);
    });
});

router.get('/BoletosUsuarios', authMiddleware, (req, res) => {
    if (!req.usuario) {
        return res.status(403).json({ error: 'Acceso denegado' });
    }

    const query = 'SELECT * FROM boletos';
    connection.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al obtener los boletos' });
        res.status(200).json(results);
    });
});

// Obtener boletos de un usuario
router.get('/boletos/usuario/:id_usuario', authMiddleware, (req, res) => {
    const { id_usuario } = req.params;

    const query = `
        SELECT b.* FROM boletos b
        JOIN compras c ON b.id_compra = c.id_compra
        WHERE c.id_usuario = ?`;
    
    connection.query(query, [id_usuario], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al obtener boletos del usuario' });
        res.status(200).json(results);
    });
});

// Obtener detalles de un boleto específico
router.get('/boletos/:id_boleto', authMiddleware, (req, res) => {
    const { id_boleto } = req.params;

    const query = 'SELECT * FROM boletos WHERE id_boleto = ?';
    connection.query(query, [id_boleto], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al obtener el boleto' });
        if (results.length === 0) return res.status(404).json({ error: 'Boleto no encontrado' });
        
        res.status(200).json(results[0]);
    });
});

// Crear boletos tras una compra
router.post('/boletos', authMiddleware, (req, res) => {
    const { id_compra, boletos } = req.body;

    if (!id_compra || !boletos || boletos.length === 0) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }

    const values = boletos.map(b => [id_compra, b.id_disponibilidad, b.tipo_boleto, b.precio_unitario, 'activo']);

    const query = 'INSERT INTO boletos (id_compra, id_disponibilidad, tipo_boleto, precio_unitario, estado) VALUES ?';

    connection.query(query, [values], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al crear boletos' });

        res.status(201).json({
            mensaje: 'Boletos generados exitosamente',
            boletos_creados: results.affectedRows
        });
    });
});

// Anular un boleto
router.post('/boletos/:id_boleto/anular', authMiddleware, (req, res) => {
    const { id_boleto } = req.params;

    const query = 'UPDATE boletos SET estado = "anulado" WHERE id_boleto = ?';
    connection.query(query, [id_boleto], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al anular el boleto' });
        if (results.affectedRows === 0) return res.status(404).json({ error: 'Boleto no encontrado' });

        res.status(200).json({ mensaje: 'Boleto anulado exitosamente' });
    });
});

// Validar si un boleto es válido
router.post('/boletos/validar', authMiddleware, (req, res) => {
    const { id_boleto } = req.body;

    const query = 'SELECT * FROM boletos WHERE id_boleto = ? AND estado = "activo"';
    connection.query(query, [id_boleto], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al validar el boleto' });
        if (results.length === 0) return res.status(400).json({ error: 'Boleto inválido o anulado' });

        res.status(200).json({ mensaje: 'Boleto válido', boleto: results[0] });
    });
});

// Eliminar un boleto (Solo Admin)
router.delete('/boletos/:id_boleto', authMiddleware, (req, res) => {
    if (!req.usuario.isAdmin) {
        return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { id_boleto } = req.params;
    const query = 'DELETE FROM boletos WHERE id_boleto = ?';

    connection.query(query, [id_boleto], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al eliminar el boleto' });
        if (results.affectedRows === 0) return res.status(404).json({ error: 'Boleto no encontrado' });

        res.status(200).json({ mensaje: 'Boleto eliminado exitosamente' });
    });
});

router.put('/boletos/:id_boleto', authMiddleware, (req, res) => {
    const { id_boleto } = req.params;
    const { id_disponibilidad, tipo_boleto, precio_unitario, estado } = req.body;

    if (!id_disponibilidad || !tipo_boleto || !precio_unitario || !estado) {
        return res.status(400).json({ error: 'Datos incompletos' });
    }

    const query = `UPDATE boletos SET id_disponibilidad = ?, tipo_boleto = ?, precio_unitario = ?, estado = ? WHERE id_boleto = ?`;

    connection.query(query, [id_disponibilidad, tipo_boleto, precio_unitario, estado, id_boleto], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al actualizar el boleto' });
        if (results.affectedRows === 0) return res.status(404).json({ error: 'Boleto no encontrado' });

        res.status(200).json({ mensaje: 'Boleto actualizado exitosamente' });
    });
});

module.exports = router;
