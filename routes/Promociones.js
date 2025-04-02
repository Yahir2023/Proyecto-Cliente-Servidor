const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const secretKey = process.env.SECRET_KEY || "secreto_super_seguro";
const { connection } = require("../config/config.db");

// Middleware para validar el token JWT
const authMiddleware = (req, res, next) => {
  let token = req.header("Authorization");
  if (!token) {
    return res.status(401).json({ mensaje: "Acceso denegado. No hay token." });
  }
  // Eliminar el prefijo "Bearer " si está presente
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

// Middleware para validar que el usuario sea administrador
const adminMiddleware = (req, res, next) => {
  if (!req.usuario.isAdmin) {
    return res.status(403).json({ mensaje: "Acceso denegado. Solo administradores pueden realizar esta acción." });
  }
  next();
};

router.get("/promociones/usuario/:id_usuario", authMiddleware, (req, res) => {
  const { id_usuario } = req.params;

  const query = `
    SELECT p.* FROM promociones p
    JOIN compras c ON p.id_promocion = c.id_promocion
    WHERE c.id_usuario = ?
  `;

  connection.query(query, [id_usuario], (error, results) => {
    if (error) {
      console.error("Error al obtener promociones:", error);
      return res.status(500).json({ error: "Error al obtener promociones" });
    }
    res.status(200).json(results);
  });
});

router.get("/promociones", authMiddleware, (req, res) => {
  const { search } = req.query;
  
  let query = "SELECT * FROM promociones WHERE 1=1";
  const params = [];

  if (search) {
    query += " AND descripcion LIKE ?";
    params.push(`%${search}%`);
  }
  
  connection.query(query, params, (error, results) => {
    if (error) {
      console.error("Error al obtener promociones:", error);
      return res.status(500).json({ error: "Error al obtener promociones" });
    }
    res.status(200).json(results);
  });
});

//Solo administradores pueden crear una nueva promoción
router.post("/promociones", authMiddleware, adminMiddleware, (req, res) => {
  const { descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin } = req.body;

  const query = `
    INSERT INTO promociones 
      (descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin, created_at, updated_at) 
    VALUES (?, ?, ?, ?, ?, NOW(), NOW())
  `;

  connection.query(
    query,
    [descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin],
    (error, results) => {
      if (error) {
        console.error("Error al insertar promoción:", error);
        return res.status(500).json({ error: "Error al insertar promoción" });
      }
      res.status(201).json({
        mensaje: "Promoción agregada correctamente",
        id_promocion: results.insertId
      });
    }
  );
});

//Solo administradores pueden actualizar una promoción
router.put("/promociones/:id", authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  const { descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin } = req.body;

  const query = `
    UPDATE promociones
    SET
      descripcion = ?,
      tipo_descuento = ?,
      valor_descuento = ?,
      fecha_inicio = ?,
      fecha_fin = ?,
      updated_at = NOW()
    WHERE id_promocion = ?
  `;

  connection.query(
    query,
    [descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin, id],
    (error, results) => {
      if (error) {
        console.error("Error al actualizar la promoción:", error);
        return res.status(500).json({ error: "Error al actualizar la promoción" });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ error: "No se encontró la promoción para actualizar" });
      }
      res.status(200).json({ mensaje: "Promoción actualizada correctamente" });
    }
  );
});

//Solo administradores pueden eliminar una promoción
router.delete("/promociones/:id", authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;

  const query = "DELETE FROM promociones WHERE id_promocion = ?";
  
  connection.query(query, [id], (error, results) => {
    if (error) {
      console.error("Error al eliminar la promoción:", error);
      return res.status(500).json({ error: "Error al eliminar la promoción" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "No se encontró la promoción para eliminar" });
    }
    res.status(200).json({ mensaje: "Promoción eliminada correctamente" });
  });
});

module.exports = router;
