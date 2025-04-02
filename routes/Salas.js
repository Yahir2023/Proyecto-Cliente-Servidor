const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const dotenv = require('dotenv');
dotenv.config();

const secretKey = process.env.SECRET_KEY || "secreto_super_seguro";
const { connection } = require("../config/config.db");

// Middleware para validar el token JWT
const authMiddleware = (req, res, next) => {
    let token = req.header("Authorization");
    if (!token) {
        return res.status(401).json({ mensaje: "Acceso denegado. No hay token." });
    }
    if (token.startsWith("Bearer ")) {
        token = token.slice(7).trim();
    }
    try {
        const decoded = jwt.verify(token, secretKey);
        req.usuario = decoded; // Se espera que el token incluya { id, isAdmin, ... }
        next();
    } catch (error) {
        return res.status(401).json({ mensaje: "Token no válido" });
    }
};

// Obtener todas las salas (Solo Admin)
router.get('/salas', authMiddleware, (req, res) => {
    if (!req.usuario.isAdmin) {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden acceder a este endpoint.' });
    }
    const query = 'SELECT * FROM salas';
    connection.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al obtener las salas' });
        }
        res.status(200).json(results);
    });
});

// Obtener una sala por ID
router.get('/salas/:id_sala', authMiddleware, (req, res) => {
    const { id_sala } = req.params;
    const query = 'SELECT * FROM salas WHERE id_sala = ?';
    connection.query(query, [id_sala], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al obtener la sala' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Sala no encontrada' });
        }
        res.status(200).json(results[0]);
    });
});

// Crear una nueva sala (Solo Admin)
router.post('/salas', authMiddleware, (req, res) => {
    if (!req.usuario.isAdmin) {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden crear salas.' });
    }
    const { id_tipo_sala, nombre, capacidad } = req.body;
    if (!id_tipo_sala || !nombre || !capacidad) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: id_tipo_sala, nombre y capacidad.' });
    }
    const query = 'INSERT INTO salas (id_tipo_sala, nombre, capacidad) VALUES (?, ?, ?)';
    connection.query(query, [id_tipo_sala, nombre, capacidad], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al crear la sala' });
        }
        res.status(201).json({ mensaje: 'Sala creada correctamente', id_sala: results.insertId });
    });
});

// Actualizar una sala (Solo Admin)
router.put('/salas/:id_sala', authMiddleware, (req, res) => {
    if (!req.usuario.isAdmin) {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden actualizar salas.' });
    }
    const { id_sala } = req.params;
    const { id_tipo_sala, nombre, capacidad } = req.body;
    const query = 'UPDATE salas SET id_tipo_sala = ?, nombre = ?, capacidad = ?, updated_at = CURRENT_TIMESTAMP WHERE id_sala = ?';
    connection.query(query, [id_tipo_sala, nombre, capacidad, id_sala], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al actualizar la sala' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Sala no encontrada' });
        }
        res.status(200).json({ mensaje: 'Sala actualizada correctamente' });
    });
});

// Eliminar una sala (Solo Admin)
router.delete('/salas/:id_sala', authMiddleware, (req, res) => {
    if (!req.usuario.isAdmin) {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden eliminar salas.' });
    }
    const { id_sala } = req.params;
    const query = 'DELETE FROM salas WHERE id_sala = ?';
    connection.query(query, [id_sala], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al eliminar la sala' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Sala no encontrada' });
        }
        res.status(200).json({ mensaje: 'Sala eliminada correctamente' });
    });
});

// Obtener todos los tipos de sala
router.get('/tipo_sala', (req, res) => {
    const query = 'SELECT * FROM tipo_sala';
    connection.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al obtener los tipos de sala' });
        }
        res.status(200).json(results);
    });
});

module.exports=router;