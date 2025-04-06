const express = require("express");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
dotenv.config();

const { connection } = require("../config/config.db");

const app = express();
app.use(express.json());

const secretKey = process.env.SECRET_KEY || "secreto_super_seguro";

// Middleware para validar el token JWT
const authMiddleware = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res.status(401).json({ mensaje: "Acceso denegado. No hay token." });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  try {
    const decoded = jwt.verify(token, secretKey);
    req.admin = decoded; // Guardamos los datos del administrador en la request
    next();
  } catch (error) {
    res.status(401).json({ mensaje: "Token no válido" });
  }
};

// Obtener todos los administradores (acceso solo para administradores autenticados)
app.get("/admin", authMiddleware, (req, res) => {
  connection.query("SELECT * FROM administradores", (error, results) => {
    if (error)
      return res
        .status(500)
        .json({ mensaje: "Error al obtener administradores" });
    res.status(200).json(results);
  });
});

// Registrar nuevo administrador (acceso solo para ciertos roles, por ejemplo, Gerente)
app.post("/admin", authMiddleware, async (req, res) => {
  const { nombre, apellido, correo, contraseña, rol } = req.body;

  try {
    const salt = await bcrypt.genSalt(10);
    const contraseñaEncriptada = await bcrypt.hash(contraseña, salt);

    connection.query(
      "INSERT INTO administradores (nombre, apellido, correo, contraseña, rol) VALUES (?, ?, ?, ?, ?)",
      [nombre, apellido, correo, contraseñaEncriptada, rol],
      (error, results) => {
        if (error)
          return res
            .status(500)
            .json({ mensaje: "Error al registrar administrador" });
        res.status(201).json({
          mensaje: "Administrador registrado correctamente",
          id: results.insertId,
        });
      }
    );
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error al registrar administrador", error });
  }
});

// Editar administrador (solo si el usuario autenticado es administrador)
app.put("/admin/:id_admin", authMiddleware, async (req, res) => {
  const { id_admin } = req.params;
  const { nombre, apellido, correo, contraseña, rol } = req.body;

  // Se permite la edición únicamente si el usuario autenticado tiene rol de "administrador"
  if (req.admin.rol !== "Gerente") {
    return res.status(403).json({
      mensaje: "Acceso denegado. Solo administradores pueden modificar este administrador.",
    });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const contraseñaEncriptada = await bcrypt.hash(contraseña, salt);

    connection.query(
      "UPDATE administradores SET nombre = ?, apellido = ?, correo = ?, contraseña = ?, rol = ?, updated_at = CURRENT_TIMESTAMP WHERE id_admin = ?",
      [nombre, apellido, correo, contraseñaEncriptada, rol, id_admin],
      (error, results) => {
        if (error)
          return res
            .status(500)
            .json({ mensaje: "Error al actualizar administrador" });
        if (results.affectedRows === 0) {
          return res
            .status(404)
            .json({ mensaje: "Administrador no encontrado" });
        }
        res.json({ mensaje: "Administrador actualizado correctamente" });
      }
    );
  } catch (error) {
    res
      .status(500)
      .json({ mensaje: "Error al actualizar administrador", error });
  }
});

// Eliminar administrador (solo si el usuario autenticado es Gerente)
app.delete("/admin/:id_admin", authMiddleware, (req, res) => {
  const { id_admin } = req.params;

  // Validar que solo un Gerente pueda eliminar
  if (req.admin.rol !== "Gerente") {
    return res.status(403).json({
      mensaje: "Acceso denegado. Solo Gerentes pueden eliminar este administrador.",
    });
  }

  connection.query(
    "DELETE FROM administradores WHERE id_admin = ?",
    [id_admin],
    (error, results) => {
      if (error)
        return res
          .status(500)
          .json({ mensaje: "Error al eliminar administrador", error });
      if (results.affectedRows === 0) {
        return res
          .status(404)
          .json({ mensaje: "Administrador no encontrado" });
      }
      res.json({ mensaje: "Administrador eliminado correctamente" });
    }
  );
});


module.exports = app;
