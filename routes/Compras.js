const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const secretKey = process.env.SECRET_KEY || "secreto_super_seguro";
const { connection } = require("../config/config.db"); 

// Middleware para validar el token JWT
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
    req.usuario = decoded; // Se espera que el token incluya { id, isAdmin, ... }
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token no válido" });
  }
};

/**
 * - Si el usuario es administrador, devuelve todas.
 * - Si no es admin, devuelve solo las compras propias.
 */
router.get('/compras', authMiddleware, (req, res) => {
  let query, params = [];
  if (req.usuario.isAdmin) {
    query = 'SELECT * FROM compras';
  } else {
    query = 'SELECT * FROM compras WHERE id_usuario = ?';
    params.push(req.usuario.id);
  }
  connection.query(query, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener las compras' });
    }
    res.status(200).json(results);
  });
});

/**
 * Retorna los detalles de una compra específica.
 * Solo el propietario o un administrador pueden acceder.
 */
router.get('/compras/:id', authMiddleware, (req, res) => {
  const idCompra = req.params.id;
  const query = 'SELECT * FROM compras WHERE id_compra = ?';
  connection.query(query, [idCompra], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener la compra' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    // Si no es admin y la compra no pertenece al usuario
    if (!req.usuario.isAdmin && results[0].id_usuario != req.usuario.id) {
      return res.status(403).json({ error: 'Acceso denegado. No puedes ver esta compra.' });
    }
    res.status(200).json(results[0]);
  });
});

/**
 * Retorna todas las compras de un usuario específico.
 * Solo accesible si es el usuario o un administrador.
 */
router.get('/compras/usuario/:id_usuario', authMiddleware, (req, res) => {
  const idUsuario = req.params.id_usuario;
  if (!req.usuario.isAdmin && req.usuario.id != idUsuario) {
    return res.status(403).json({ error: 'Acceso denegado. No puedes ver las compras de otro usuario.' });
  }
  const query = 'SELECT * FROM compras WHERE id_usuario = ?';
  connection.query(query, [idUsuario], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener las compras del usuario' });
    }
    res.status(200).json(results);
  });
});

/**
 * Crea una nueva compra. Se asume que el estado inicial es "pendiente".
 * Si el usuario no es administrador, solo puede crear compras para sí mismo.
 */
router.post('/compras', authMiddleware, (req, res) => {
  const { id_usuario, id_funcion, id_promocion, cantidad_adultos, cantidad_ninos, total } = req.body;
  if (!id_usuario || !id_funcion || !cantidad_adultos || !cantidad_ninos || !total) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  if (!req.usuario.isAdmin && req.usuario.id != id_usuario) {
    return res.status(403).json({ error: 'Acceso denegado. No puedes crear compras para otro usuario.' });
  }
  const query = `
    INSERT INTO compras 
      (id_usuario, id_funcion, id_promocion, cantidad_adultos, cantidad_ninos, total, estado)
    VALUES (?, ?, ?, ?, ?, ?, 'pendiente')
  `;
  connection.query(query, [id_usuario, id_funcion, id_promocion, cantidad_adultos, cantidad_ninos, total], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al crear la compra' });
    }
    res.status(201).json({ mensaje: 'Compra creada correctamente', id_compra: results.insertId });
  });
});

/**
 * Actualiza una compra en estado "pendiente".
 * Solo el propietario o un administrador pueden actualizarla.
 */
router.put('/compras/:id', authMiddleware, (req, res) => {
  const idCompra = req.params.id;
  const { id_funcion, id_promocion, cantidad_adultos, cantidad_ninos, total } = req.body;
  const selectQuery = 'SELECT * FROM compras WHERE id_compra = ?';
  connection.query(selectQuery, [idCompra], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener la compra' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    const compra = results[0];
    if (!req.usuario.isAdmin && compra.id_usuario != req.usuario.id) {
      return res.status(403).json({ error: 'Acceso denegado. No puedes actualizar esta compra.' });
    }
    if (compra.estado !== 'pendiente') {
      return res.status(400).json({ error: 'Solo se pueden actualizar compras en estado pendiente' });
    }
    const updateQuery = `
      UPDATE compras 
      SET id_funcion = ?, id_promocion = ?, cantidad_adultos = ?, cantidad_ninos = ?, total = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id_compra = ?
    `;
    connection.query(updateQuery, [id_funcion, id_promocion, cantidad_adultos, cantidad_ninos, total, idCompra], (err, updateResults) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al actualizar la compra' });
      }
      res.status(200).json({ mensaje: 'Compra actualizada correctamente' });
    });
  });
});

/**
 * Cancela (o elimina) una compra actualizando su estado a "cancelada".
 * Solo se permite si la compra está en estado "pendiente".
 */
router.delete('/compras/:id', authMiddleware, (req, res) => {
  const idCompra = req.params.id;
  const selectQuery = 'SELECT * FROM compras WHERE id_compra = ?';
  connection.query(selectQuery, [idCompra], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener la compra' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    const compra = results[0];
    if (!req.usuario.isAdmin && compra.id_usuario != req.usuario.id) {
      return res.status(403).json({ error: 'Acceso denegado. No puedes cancelar esta compra.' });
    }
    if (compra.estado !== 'pendiente') {
      return res.status(400).json({ error: 'Solo se pueden cancelar compras en estado pendiente' });
    }
    const updateQuery = 'UPDATE compras SET estado = "cancelada", updated_at = CURRENT_TIMESTAMP WHERE id_compra = ?';
    connection.query(updateQuery, [idCompra], (err, updateResults) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al cancelar la compra' });
      }
      res.status(200).json({ mensaje: 'Compra cancelada correctamente' });
    });
  });
});

/**
 * Confirma una compra (cambia su estado a "confirmada").
 * Solo el propietario o un administrador pueden confirmar la compra, siempre que esté en estado "pendiente".
 */
router.post('/compras/:id/confirmar', authMiddleware, (req, res) => {
  const idCompra = req.params.id;
  const selectQuery = 'SELECT * FROM compras WHERE id_compra = ?';
  connection.query(selectQuery, [idCompra], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener la compra' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    const compra = results[0];
    if (!req.usuario.isAdmin && compra.id_usuario != req.usuario.id) {
      return res.status(403).json({ error: 'Acceso denegado. No puedes confirmar esta compra.' });
    }
    if (compra.estado !== 'pendiente') {
      return res.status(400).json({ error: 'Solo se pueden confirmar compras en estado pendiente' });
    }
    const updateQuery = 'UPDATE compras SET estado = "confirmada", updated_at = CURRENT_TIMESTAMP WHERE id_compra = ?';
    connection.query(updateQuery, [idCompra], (err, updateResults) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al confirmar la compra' });
      }
      res.status(200).json({ mensaje: 'Compra confirmada correctamente' });
    });
  });
});

// También puedes optar por un endpoint POST para cancelar, en lugar de DELETE.
// Ejemplo:
// POST /compras/:id/cancelar
router.post('/compras/:id/cancelar', authMiddleware, (req, res) => {
  const idCompra = req.params.id;
  const selectQuery = 'SELECT * FROM compras WHERE id_compra = ?';
  connection.query(selectQuery, [idCompra], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener la compra' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    const compra = results[0];
    if (!req.usuario.isAdmin && compra.id_usuario != req.usuario.id) {
      return res.status(403).json({ error: 'Acceso denegado. No puedes cancelar esta compra.' });
    }
    if (compra.estado !== 'pendiente') {
      return res.status(400).json({ error: 'Solo se pueden cancelar compras en estado pendiente' });
    }
    const updateQuery = 'UPDATE compras SET estado = "cancelada", updated_at = CURRENT_TIMESTAMP WHERE id_compra = ?';
    connection.query(updateQuery, [idCompra], (err, updateResults) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al cancelar la compra' });
      }
      res.status(200).json({ mensaje: 'Compra cancelada correctamente' });
    });
  });
});

module.exports = router;
