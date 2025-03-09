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
  if (!token)
    return res
      .status(401)
      .json({ mensaje: "Acceso denegado. No hay token." });

  try {
    const decoded = jwt.verify(token, secretKey);
    req.admin = decoded; // Guardamos los datos del administrador en la request
    next();
  } catch (error) {
    res.status(401).json({ mensaje: "Token no válido" });
  }
};

// Iniciar sesión para administradores
app.post("/auth/login", (req, res) => {
  const { correo, contraseña } = req.body;

  connection.query(
    "SELECT * FROM administradores WHERE correo = ?",
    [correo],
    async (error, results) => {
      if (error)
        return res.status(500).json({ mensaje: "Error en el servidor" });

      if (results.length === 0)
        return res
          .status(400)
          .json({ mensaje: "Credenciales incorrectas" });

      const admin = results[0];
      const validPassword = await bcrypt.compare(contraseña, admin.contraseña);
      if (!validPassword)
        return res
          .status(400)
          .json({ mensaje: "Credenciales incorrectas" });

      // Creamos el token con la información del administrador
      const token = jwt.sign(
        {
          id: admin.id_admin,
          correo: admin.correo,
          rol: admin.rol,
          isAdmin: true,
        },
        secretKey,
        { expiresIn: "1h" }
      );

      res.json({ mensaje: "Inicio de sesión exitoso", token });
    }
  );
});

// Obtener todos los administradores (acceso solo para administradores autenticados)
app.get("/admin", authMiddleware, (req, res) => {
  // En este ejemplo se asume que quien haga la petición es administrador (por el token)
  connection.query("SELECT * FROM administradores", (error, results) => {
    if (error)
      return res
        .status(500)
        .json({ mensaje: "Error al obtener administradores" });
    res.status(200).json(results);
  });
});

// que solo ciertos roles (por ejemplo, Gerente) puedan registrar nuevos administradores.
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

// Editar administrador (solo el propio administrador puede editar sus datos)
app.put("/admin/:id_admin", authMiddleware, async (req, res) => {
  const { id_admin } = req.params;
  const { nombre, apellido, correo, contraseña, rol } = req.body;

  // Permitir edición solo si el administrador autenticado es el mismo que se desea modificar
  if (req.admin.id !== parseInt(id_admin)) {
    return res.status(403).json({
      mensaje: "Acceso denegado. No puedes modificar este administrador.",
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

// Eliminar administrador (solo el propio administrador puede eliminar su cuenta)
app.delete("/admin/:id_admin", authMiddleware, (req, res) => {
  const { id_admin } = req.params;

  if (req.admin.id !== parseInt(id_admin)) {
    return res.status(403).json({
      mensaje: "Acceso denegado. No puedes eliminar este administrador.",
    });
  }

  connection.query(
    "DELETE FROM administradores WHERE id_admin = ?",
    [id_admin],
    (error, results) => {
      if (error)
        return res
          .status(500)
          .json({ mensaje: "Error al eliminar administrador" });
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
