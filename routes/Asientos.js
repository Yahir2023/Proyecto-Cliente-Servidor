const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const dotenv = require('dotenv');
dotenv.config();

const secretKey = process.env.SECRET_KEY || "secreto_super_seguro";
const { connection } = require("../config/config.db");

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

// Obtener todos los asientos (Solo Admin)
router.get('/asientos', authMiddleware, (req, res) => {
    if (!req.usuario.isAdmin) {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden acceder a este endpoint.' });
    }
    const query = 'SELECT * FROM asientos';
    connection.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al obtener los asientos' });
        }
        res.status(200).json(results);
    });
});


 //Obtiene todos los asientos de una sala específica.
router.get('/asientos/sala/:id_sala', authMiddleware, (req, res) => {
    const { id_sala } = req.params;
    const query = 'SELECT * FROM asientos WHERE id_sala = ?';
    connection.query(query, [id_sala], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al obtener los asientos de la sala' });
        }
        res.status(200).json(results);
    });
});


 //Obtiene los detalles de un asiento específico.
router.get('/asientos/:id_asiento', authMiddleware, (req, res) => {
    const { id_asiento } = req.params;
    const query = 'SELECT * FROM asientos WHERE id_asiento = ?';
    connection.query(query, [id_asiento], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al obtener el asiento' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Asiento no encontrado' });
        }
        res.status(200).json(results[0]);
    });
});


 //Crea un nuevo asiento (Solo Admin).
router.post('/asientos', authMiddleware, (req, res) => {
    if (!req.usuario.isAdmin) {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden crear asientos.' });
    }
    const { id_sala, numero_asiento, fila, tipo_asiento, precio_extra } = req.body;
    if (!id_sala || !numero_asiento || !fila) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: id_sala, numero_asiento y fila.' });
    }
    const query = 'INSERT INTO asientos (id_sala, numero_asiento, fila, tipo_asiento, precio_extra) VALUES (?, ?, ?, ?, ?)';
    connection.query(query, [id_sala, numero_asiento, fila, tipo_asiento || 'Standard', precio_extra || 0.00], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al crear el asiento' });
        }
        res.status(201).json({ mensaje: 'Asiento creado correctamente', id_asiento: results.insertId });
    });
});

 //Actualiza los detalles de un asiento (Solo Admin).
router.put('/asientos/:id_asiento', authMiddleware, (req, res) => {
    if (!req.usuario.isAdmin) {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden actualizar asientos.' });
    }
    const { id_asiento } = req.params;
    const { numero_asiento, fila, tipo_asiento, precio_extra } = req.body;
    const query = 'UPDATE asientos SET numero_asiento = ?, fila = ?, tipo_asiento = ?, precio_extra = ?, updated_at = CURRENT_TIMESTAMP WHERE id_asiento = ?';
    connection.query(query, [numero_asiento, fila, tipo_asiento, precio_extra, id_asiento], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al actualizar el asiento' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Asiento no encontrado' });
        }
        res.status(200).json({ mensaje: 'Asiento actualizado correctamente' });
    });
});

//Elimina un asiento (Solo Admin).
router.delete('/asientos/:id_asiento', authMiddleware, (req, res) => {
    if (!req.usuario.isAdmin) {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden eliminar asientos.' });
    }
    const { id_asiento } = req.params;
    const query = 'DELETE FROM asientos WHERE id_asiento = ?';
    connection.query(query, [id_asiento], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al eliminar el asiento' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Asiento no encontrado' });
        }
        res.status(200).json({ mensaje: 'Asiento eliminado correctamente' });
    });
});

 //Verifica la disponibilidad de un asiento para una función específica.
router.get('/asientos/:id_asiento/disponibilidad/:id_funcion', authMiddleware, (req, res) => {
    const { id_asiento, id_funcion } = req.params;
    const query = 'SELECT * FROM disponibilidad_asientos WHERE id_asiento = ? AND id_funcion = ?';
    connection.query(query, [id_asiento, id_funcion], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al verificar disponibilidad' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'No se encontró información de disponibilidad para este asiento y función' });
        }
        res.status(200).json(results[0]);
    });
});

 //Reserva un asiento para un usuario en una función.
router.post('/asientos/reservar', authMiddleware, (req, res) => {
    const { id_asiento, id_funcion, id_usuario } = req.body;
    if (!id_asiento || !id_funcion || !id_usuario) {
        return res.status(400).json({ error: 'Datos incompletos: se requiere id_asiento, id_funcion e id_usuario' });
    }
    // Ejemplo: actualizar el estado a "reservado" en la tabla de disponibilidad
    const query = 'UPDATE disponibilidad_asientos SET estado = "reservado", updated_at = CURRENT_TIMESTAMP WHERE id_asiento = ? AND id_funcion = ?';
    connection.query(query, [id_asiento, id_funcion], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al reservar el asiento' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'No se pudo reservar el asiento, verifique los datos' });
        }
        res.status(200).json({ mensaje: 'Asiento reservado exitosamente' });
    });
});

module.exports = router;
