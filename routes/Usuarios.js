const express = require("express");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
dotenv.config();

const { connection } = require("../config/config.db");

const app = express();
app.use(express.json());

const secretKey = process.env.SECRET_KEY || "secreto_super_seguro"; // Clave secreta para JWT

// Middleware para validar el token JWT
const authMiddleware = (req, res, next) => {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res.status(401).json({ mensaje: "Acceso denegado. No hay token." });
    }
  
    const tokenPart = authHeader.split(" ")[1];
    if (!tokenPart) {
      return res.status(401).json({ mensaje: "Token malformado." });
    }
  
    try {
      const decoded = jwt.verify(tokenPart, secretKey);
      req.usuario = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ mensaje: "Token no válido" });
    }
  };
  

// Obtener datos de un usuario en específico (para el propio usuario o administrador)
app.get("/usuarios/:id_usuario", authMiddleware, (req, res) => {
  const { id_usuario } = req.params;

  // Permitir acceso si es administrador o si el usuario es el mismo
  if (!req.usuario.isAdmin && req.usuario.id !== parseInt(id_usuario)) {
    return res.status(403).json({ mensaje: "Acceso denegado." });
  }

  connection.query("SELECT * FROM usuarios WHERE id_usuario = ?", [id_usuario], (error, results) => {
    if (error) return res.status(500).json({ mensaje: "Error al obtener usuario" });
    if (results.length === 0) return res.status(404).json({ mensaje: "Usuario no encontrado" });
    res.status(200).json(results[0]);
  });
});

   app.get("/usuarios", authMiddleware, (req, res) => {
    if (!req.usuario.isAdmin) {
      return res.status(403).json({ mensaje: "Acceso denegado. Se requiere rol de administrador" });
    }
    connection.query("SELECT * FROM usuarios", (error, results) => {
      if (error) return res.status(500).json({ mensaje: "Error al obtener usuarios" });
      res.status(200).json(results);
    });
  });

// Registrar un nuevo usuario (contraseña encriptada)
app.post("/usuarios", async (req, res) => {
    try {
        const { nombre, apellido, correo, contraseña = "usuario" } = req.body;

        const salt = await bcrypt.genSalt(10);
        const contraseñaEncriptada = await bcrypt.hash(contraseña, salt);

        connection.query(
            "INSERT INTO usuarios (nombre, apellido, correo, contraseña) VALUES (?, ?, ?, ?)",
            [nombre, apellido, correo, contraseñaEncriptada],
            (error, results) => {
                if (error) return res.status(500).json({ mensaje: "Error al registrar usuario" });
                res.status(201).json({ mensaje: "Usuario registrado correctamente", id: results.insertId });
            }
        );
    } catch (error) {
        res.status(500).json({ mensaje: "Error al registrar usuario" });
    }
});

// Editar usuario (solo el mismo usuario o administrador)
app.put("/usuarios/:id_usuario", authMiddleware, async (req, res) => {
    const { id_usuario } = req.params;
    const { nombre, apellido, correo, contraseña } = req.body;

    // Permitir edición si el usuario es administrador o es el mismo usuario
    if (!req.usuario.isAdmin && req.usuario.id !== parseInt(id_usuario)) {
        return res.status(403).json({ mensaje: "Acceso denegado. No puedes modificar este usuario." });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const contraseñaEncriptada = await bcrypt.hash(contraseña, salt);

        connection.query(
            "UPDATE usuarios SET nombre = ?, apellido = ?, correo = ?, contraseña = ?, updated_at = CURRENT_TIMESTAMP WHERE id_usuario = ?",
            [nombre, apellido, correo, contraseñaEncriptada, id_usuario],
            (error, results) => {
                if (error) return res.status(500).json({ mensaje: "Error al actualizar usuario" });
                if (results.affectedRows === 0) {
                    return res.status(404).json({ mensaje: "Usuario no encontrado" });
                }
                res.json({ mensaje: "Usuario actualizado correctamente" });
            }
        );
    } catch (error) {
        res.status(500).json({ mensaje: "Error al actualizar usuario" });
    }
});

// Eliminar usuario (solo el mismo usuario o administrador)
app.delete("/usuarios/:id_usuario", authMiddleware, (req, res) => {
    const { id_usuario } = req.params;

    if (!req.usuario.isAdmin && req.usuario.id !== parseInt(id_usuario)) {
        return res.status(403).json({ mensaje: "Acceso denegado. No puedes eliminar este usuario." });
    }

    connection.query("DELETE FROM usuarios WHERE id_usuario = ?", [id_usuario], (error, results) => {
        if (error) return res.status(500).json({ mensaje: "Error al eliminar usuario" });
        if (results.affectedRows === 0) {
            return res.status(404).json({ mensaje: "Usuario no encontrado" });
        }
        res.json({ mensaje: "Usuario eliminado correctamente" });
    });
});

app.put("/usuarios/:id_usuario/password", authMiddleware, async (req, res) => {
  try {
      const { id_usuario } = req.params;
      const { contraseña } = req.body;

      // Verificar que el usuario autenticado es el mismo que quiere cambiar su contraseña
      if (req.usuario.id != id_usuario) {
          return res.status(403).json({ mensaje: "Acceso denegado" });
      }

      if (!contraseña) {
          return res.status(400).json({ mensaje: "La nueva contraseña es requerida." });
      }

      // Encriptar la nueva contraseña
      const salt = await bcrypt.genSalt(10);
      const contraseñaEncriptada = await bcrypt.hash(contraseña, salt);

      // Actualizar la contraseña en la base de datos
      connection.query(
          "UPDATE usuarios SET contraseña = ? WHERE id_usuario = ?",
          [contraseñaEncriptada, id_usuario],
          (error, results) => {
              if (error) {
                  return res.status(500).json({ mensaje: "Error al actualizar la contraseña." });
              }
              if (results.affectedRows === 0) {
                  return res.status(404).json({ mensaje: "Usuario no encontrado." });
              }
              res.status(200).json({ mensaje: "Contraseña actualizada con éxito." });
          }
      );
  } catch (error) {
      res.status(500).json({ mensaje: "Error en el servidor." });
  }
});

module.exports = app;