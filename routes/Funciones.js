const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const secretKey = process.env.SECRET_KEY || "secreto_super_seguro";
const { connection } = require("../config/config.db");

// Middleware para validar el token JWT (tal como lo proporcionaste)
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

// Obtener funciones de cine (Solo administradores)
router.get('/funciones', authMiddleware, (req, res) => {
    if (!req.usuario.isAdmin) {
        return res.status(403).json({ mensaje: 'Acceso denegado.' });
    }
    
    connection.query('SELECT * FROM funciones', (error, results) => {
        if (error) return res.status(500).json({ error: 'Error al obtener funciones' });
        res.status(200).json(results);
    });
});

// Crear nueva función de cine (Solo administradores)
router.post('/funciones', authMiddleware, (req, res) => {
    if (!req.usuario.isAdmin) {
        return res.status(403).json({ mensaje: 'Acceso denegado.' });
    }
    
    const { pelicula, fecha, hora } = req.body;
    if (!pelicula || !fecha || !hora) {
        return res.status(400).json({ error: 'Faltan datos obligatorios.' });
    }
    
    connection.query(
        'INSERT INTO funciones (pelicula, fecha, hora) VALUES (?, ?, ?)', 
        [pelicula, fecha, hora],
        (error) => {
            if (error) return res.status(500).json({ error: 'Error al crear la función' });
            res.status(201).json({ mensaje: 'Función creada exitosamente' });
        }
    );
});

// Editar función de cine (Solo administradores)
router.put('/funciones/:id_funcion', authMiddleware, (req, res) => {
    if (!req.usuario.isAdmin) {
        return res.status(403).json({ mensaje: 'Acceso denegado.' });
    }
    
    const { id_funcion } = req.params;
    const { pelicula, fecha, hora } = req.body;
    if (!pelicula || !fecha || !hora) {
        return res.status(400).json({ error: 'Faltan datos obligatorios.' });
    }
    
    connection.query(
        'UPDATE funciones SET pelicula = ?, fecha = ?, hora = ? WHERE id_funcion = ?',
        [pelicula, fecha, hora, id_funcion],
        (error) => {
            if (error) return res.status(500).json({ error: 'Error al actualizar la función' });
            res.status(200).json({ mensaje: 'Función actualizada' });
        }
    );
});

// Eliminar función de cine (Solo administradores)
router.delete('/funciones/:id_funcion', authMiddleware, (req, res) => {
    if (!req.usuario.isAdmin) {
        return res.status(403).json({ mensaje: 'Acceso denegado.' });
    }
    
    const { id_funcion } = req.params;
    
    connection.query(
        'DELETE FROM funciones WHERE id_funcion = ?',
        [id_funcion],
        (error) => {
            if (error) return res.status(500).json({ error: 'Error al eliminar la función' });
            res.status(200).json({ mensaje: 'Función eliminada' });
        }
    );
});

module.exports = router;