const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { connection } = require("../config/config.db");

const router = express.Router();
const secretKey = process.env.SECRET_KEY || "secreto";

// Middleware para verificar JWT
const authMiddleware = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ mensaje: "Acceso denegado. No hay token." });

    try {
        const verificado = jwt.verify(token.replace("Bearer ", ""), secretKey);
        req.usuario = verificado;
        next();
    } catch (err) {
        res.status(401).json({ mensaje: "Token no válido." });
    }
};

// Registro de usuario (con contraseña encriptada)
router.post("/auth/register", async (req, res) => {
    try {
        const { nombre, apellido, correo, contraseña } = req.body;
        
        // Validación básica
        if (!nombre || !apellido || !correo || !contraseña) {
            return res.status(400).json({ mensaje: "Todos los campos son obligatorios." });
        }

        // Verificar si el correo ya existe
        connection.query("SELECT correo FROM usuarios WHERE correo = ?", [correo], async (err, results) => {
            if (err) return res.status(500).json({ mensaje: "Error en la base de datos." });
            if (results.length > 0) return res.status(400).json({ mensaje: "El correo ya está registrado." });

            // Encriptar la contraseña
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(contraseña, salt);

            // Insertar usuario en la base de datos
            connection.query(
                "INSERT INTO usuarios (nombre, apellido, correo, contraseña) VALUES (?, ?, ?, ?)",
                [nombre, apellido, correo, hash],
                (err, result) => {
                    if (err) return res.status(500).json({ mensaje: "Error al registrar usuario." });
                    res.json({ mensaje: "Usuario registrado con éxito." });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ mensaje: "Error en el servidor." });
    }
});

// Inicio de sesión
router.post("/auth/login", (req, res) => {
    const { correo, contraseña } = req.body;

    // Validación de entrada
    if (!correo || !contraseña) {
        return res.status(400).json({ mensaje: "Correo y contraseña son requeridos." });
    }

    connection.query("SELECT * FROM usuarios WHERE correo = ?", [correo], async (err, results) => {
        if (err) return res.status(500).json({ mensaje: "Error en la base de datos." });
        if (results.length === 0) return res.status(400).json({ mensaje: "Credenciales incorrectas." });

        const usuario = results[0];

        try {
            const validPassword = await bcrypt.compare(contraseña, usuario.contraseña);
            if (!validPassword) return res.status(400).json({ mensaje: "Credenciales incorrectas." });

            // Generar token JWT
            const token = jwt.sign(
                { id_usuario: usuario.id_usuario, correo: usuario.correo },
                secretKey,
                { expiresIn: "1h" }
            );

            res.json({ mensaje: "Inicio de sesión exitoso.", token });
        } catch (error) {
            res.status(500).json({ mensaje: "Error al verificar la contraseña." });
        }
    });
});

// Ruta protegida
router.get("/auth/perfil", authMiddleware, (req, res) => {
    res.json({ mensaje: "Acceso a perfil permitido.", usuario: req.usuario });
});

module.exports = router;
