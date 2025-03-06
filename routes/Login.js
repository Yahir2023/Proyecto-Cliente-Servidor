const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { connection } = require("../config/config.db");

const router = express.Router();
const secretKey = process.env.SECRET_KEY || "secreto";

// Middleware para verificar JWT
const defaultMiddleware = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ mensaje: "Acceso denegado" });

    try {
        const verificado = jwt.verify(token, secretKey);
        req.usuario = verificado;
        next();
    } catch (err) {
        res.status(400).json({ mensaje: "Token no válido" });
    }
};

// Registro de usuario (con contraseña encriptada)
router.post("/auth/register", async (req, res) => {
    try {
        const { nombre, apellido, correo, contraseña } = req.body;

        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(contraseña, salt);

        connection.query(
            "INSERT INTO usuarios (nombre, apellido, correo, contraseña) VALUES (?, ?, ?, ?)",
            [nombre, apellido, correo, hash],
            (err, result) => {
                if (err) return res.status(500).json({ mensaje: "Error en el registro" });
                res.json({ mensaje: "Usuario registrado con éxito" });
            }
        );
    } catch (error) {
        res.status(500).json({ mensaje: "Error en el servidor" });
    }
});

// Inicio de sesión
router.post("/auth/login", (req, res) => {
    const { correo, contraseña } = req.body;

    connection.query("SELECT * FROM usuarios WHERE correo = ?", [correo], async (err, results) => {
        if (err || results.length === 0) return res.status(400).json({ mensaje: "Credenciales incorrectas" });

        const usuario = results[0];

        // Comparar contraseña encriptada
        const validPassword = await bcrypt.compare(contraseña, usuario.contraseña);
        if (!validPassword) return res.status(400).json({ mensaje: "Credenciales incorrectas" });

        // Generar token JWT
        const token = jwt.sign(
            { id_usuario: usuario.id_usuario, correo: usuario.correo },
            secretKey,
            { expiresIn: "1h" }
        );

        res.json({ mensaje: "Inicio de sesión exitoso", token });
    });
});

// Ruta protegida
router.get("/auth/perfil", defaultMiddleware, (req, res) => {
    res.json({ mensaje: "Acceso a perfil permitido", usuario: req.usuario });
});

module.exports = router;
