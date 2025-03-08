const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
dotenv.config();

const { connection } = require("../config/config.db");

const app = express();
app.use(cors());
app.use(express.json());

const secretKey = process.env.SECRET_KEY || "secreto_super_seguro"; // Clave secreta para JWT

// Middleware para validar el token JWT
const authMiddleware = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ mensaje: "Acceso denegado. No hay token." });

    try {
        const decoded = jwt.verify(token, secretKey);
        req.usuario = decoded; // Guardar datos del usuario en la request
        next();
    } catch (error) {
        res.status(401).json({ mensaje: "Token no válido" });
    }
};

app.post("/auth/login", (req, res) => {
    const { correo, contraseña } = req.body;
    
    // Primero se busca en la tabla de administradores
    connection.query("SELECT * FROM administradores WHERE correo = ?", [correo], async (error, results) => {
      if (error) return res.status(500).json({ mensaje: "Error en el servidor" });
      
      if (results.length > 0) {
        const admin = results[0];
        const validPassword = await bcrypt.compare(contraseña, admin.contraseña);
        if (!validPassword) {
          return res.status(400).json({ mensaje: "Credenciales incorrectas" });
        }
        
        // Se crea el token incluyendo isAdmin: true, sin importar el valor de rol en la base de datos.
        const token = jwt.sign(
          { id: admin.id_admin, correo: admin.correo, isAdmin: true, rol: admin.rol },
          secretKey,
          { expiresIn: "1h" }
        );
        return res.json({ mensaje: "Inicio de sesión exitoso", token });
      }
      
      // Si no se encuentra en administradores, se busca en usuarios
      connection.query("SELECT * FROM usuarios WHERE correo = ?", [correo], async (error, results) => {
        if (error) return res.status(500).json({ mensaje: "Error en el servidor" });
        if (results.length === 0) {
          return res.status(400).json({ mensaje: "Credenciales incorrectas" });
        }
        const usuario = results[0];
        const validPassword = await bcrypt.compare(contraseña, usuario.contraseña);
        if (!validPassword) {
          return res.status(400).json({ mensaje: "Credenciales incorrectas" });
        }
        // Token para usuario normal
        const token = jwt.sign(
          { id: usuario.id_usuario, correo: usuario.correo, isAdmin: false },
          secretKey,
          { expiresIn: "1h" }
        );
        return res.json({ mensaje: "Inicio de sesión exitoso", token });
      });
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

module.exports = app;