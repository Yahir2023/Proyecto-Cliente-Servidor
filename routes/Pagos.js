const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const secretKey = process.env.SECRET_KEY || "secreto_super_seguro";

const { connection } = require("../config/config.db");

/**
 * Middleware para validar el token JWT.
 * Se espera que el token incluya propiedades como { id, isAdmin, ... }.
 */
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
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: "Token no válido" });
  }
};

/**
 * Middleware para restringir el acceso a administradores.
 */
const adminMiddleware = (req, res, next) => {
  if (!req.usuario.isAdmin) {
    return res.status(403).json({ mensaje: "Acceso denegado. Solo administradores pueden acceder." });
  }
  next();
};

/**
 * POST /pagos
 * Inicia un nuevo pago.
 * Accesible para usuarios autenticados.
 */
const postPago = (req, res) => {
  const { id_compra, metodo_pago, estado_pago, transaction_id, monto_pagado, paypal_email } = req.body;
  connection.query(
    "INSERT INTO Pagos (id_compra, metodo_pago, estado_pago, transaction_id, monto_pagado, paypal_email) VALUES (?, ?, ?, ?, ?, ?)",
    [id_compra, metodo_pago, estado_pago, transaction_id, monto_pagado, paypal_email],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: "Error al insertar el pago" });
      } else {
        return res.status(201).json({ mensaje: "Pago añadido correctamente", filas_afectadas: results.affectedRows, id_pago: results.insertId });
      }
    }
  );
};

/**
 * GET /pagos
 * Retorna todos los pagos registrados.
 * Accesible solo para administradores.
 */
const getPagos = (req, res) => {
  connection.query(
    "SELECT * FROM Pagos",
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: "Error al obtener los pagos" });
      } else {
        return res.status(200).json(results);
      }
    }
  );
};

/**
 * GET /pagos/:id_pago
 * Retorna los detalles de un pago específico.
 * Accesible solo para administradores.
 */
const getPagoById = (req, res) => {
  const { id_pago } = req.params;
  connection.query(
    "SELECT * FROM Pagos WHERE id_pago = ?",
    [id_pago],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: "Error al obtener el pago" });
      }
      if (results.length === 0) {
        return res.status(404).json({ mensaje: "Pago no encontrado" });
      }
      return res.status(200).json(results[0]);
    }
  );
};

/**
 * POST /pagos/:id_pago/confirmar
 * Confirma un pago (actualiza su estado a "completado").
 * Accesible solo para administradores.
 */
const confirmarPago = (req, res) => {
  const { id_pago } = req.params;
  connection.query(
    "UPDATE Pagos SET estado_pago = 'completado' WHERE id_pago = ?",
    [id_pago],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: "Error al confirmar el pago" });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ mensaje: "Pago no encontrado" });
      }
      return res.status(200).json({ mensaje: "Pago confirmado correctamente" });
    }
  );
};

/**
 * POST /pagos/:id_pago/cancelar
 * Cancela un pago (actualiza su estado a "cancelado").
 * Accesible solo para administradores.
 */
const cancelarPago = (req, res) => {
  const { id_pago } = req.params;
  connection.query(
    "UPDATE Pagos SET estado_pago = 'cancelado' WHERE id_pago = ?",
    [id_pago],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: "Error al cancelar el pago" });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ mensaje: "Pago no encontrado" });
      }
      return res.status(200).json({ mensaje: "Pago cancelado correctamente" });
    }
  );
};

/**
 * POST /pagos/:id_pago/reembolsar
 * Solicita el reembolso de un pago (actualiza su estado a "en_reembolso").
 * Accesible solo para administradores.
 */
const reembolsarPago = (req, res) => {
  const { id_pago } = req.params;
  const { motivo } = req.body;
  connection.query(
    "UPDATE Pagos SET estado_pago = 'en_reembolso' WHERE id_pago = ?",
    [id_pago],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: "Error al solicitar reembolso" });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ mensaje: "Pago no encontrado" });
      }
      return res.status(200).json({ mensaje: "Reembolso solicitado", motivo });
    }
  );
};

/**
 * GET /usuarios/:id_usuario/pagos
 * Retorna el historial de pagos de un usuario.
 * Si el usuario autenticado no es administrador, solo puede consultar su propio historial.
 */
const getPagosPorUsuario = (req, res) => {
  const { id_usuario } = req.params;
  if (!req.usuario.isAdmin && req.usuario.id != id_usuario) {
    return res.status(403).json({ mensaje: "Acceso denegado. No puedes ver pagos de otro usuario." });
  }
  connection.query(
    "SELECT * FROM Pagos WHERE id_compra IN (SELECT id_compra FROM Compras WHERE id_usuario = ?)",
    [id_usuario],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: "Error al obtener historial de pagos" });
      }
      return res.status(200).json(results);
    }
  );
};

/**
 * POST /pagos/notificacion
 * Endpoint para recibir notificaciones de pago (webhook).
 * Usualmente se valida la firma o token enviado por la pasarela de pagos.
 * Aquí se actualiza el estado del pago basado en el payload recibido.
 */
const notificacionPago = (req, res) => {
  const { id_pago, estado_pago, fecha_pago } = req.body;
  connection.query(
    "UPDATE Pagos SET estado_pago = ?, fecha_pago = ? WHERE id_pago = ?",
    [estado_pago, fecha_pago, id_pago],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: "Error al procesar la notificación" });
      }
      return res.status(200).json({ mensaje: "Notificación recibida correctamente" });
    }
  );
};

//solo accesibles para administradores.
router.get("/pagos", authMiddleware, adminMiddleware, getPagos);
router.get("/pagos/:id_pago", authMiddleware, adminMiddleware, getPagoById);

//cualquier usuario autenticado.
router.post("/pagos", authMiddleware, postPago);

// Confirmar, cancelar y reembolsar pagos: acciones reservadas a administradores.
router.post("/pagos/:id_pago/confirmar", authMiddleware, adminMiddleware, confirmarPago);
router.post("/pagos/:id_pago/cancelar", authMiddleware, adminMiddleware, cancelarPago);
router.post("/pagos/:id_pago/reembolsar", authMiddleware, adminMiddleware, reembolsarPago);

// Historial de pagos de un usuario (el usuario o el admin puede consultarlo).
router.get("/usuarios/:id_usuario/pagos", authMiddleware, getPagosPorUsuario);

// Webhook para notificaciones de pago (normalmente sin autenticación o con validación propia).
router.post("/pagos/notificacion", notificacionPago);

module.exports = router;
