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

// Registro de administrador (con contraseña encriptada)
router.post("/auth/register", async (req, res) => {
    try {
        const { nombre, apellido, correo, contraseña, rol } = req.body;

        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(contraseña, salt);

        connection.query(
            "INSERT INTO administradores (nombre, apellido, correo, contraseña, rol) VALUES (?, ?, ?, ?, ?)",
            [nombre, apellido, correo, hash, rol],
            (err, result) => {
                if (err) return res.status(500).json({ mensaje: "Error en el registro" });
                res.json({ mensaje: "Administrador registrado con éxito" });
            }
        );
    } catch (error) {
        res.status(500).json({ mensaje: "Error en el servidor" });
    }
});

// Inicio de sesión
router.post("/auth/login", (req, res) => {
    const { correo, contraseña } = req.body;

    connection.query("SELECT * FROM administradores WHERE correo = ?", [correo], async (err, results) => {
        if (err || results.length === 0) return res.status(400).json({ mensaje: "Credenciales incorrectas" });

        const administrador = results[0];

        // Comparar contraseña encriptada
        const validPassword = await bcrypt.compare(contraseña, administrador.contraseña);
        if (!validPassword) return res.status(400).json({ mensaje: "Credenciales incorrectas" });

        // Generar token JWT
        const token = jwt.sign(
            { id_admin: administrador.id_admin, correo: administrador.correo, rol: administrador.rol },
            secretKey,
            { expiresIn: "2h" }
        );

        res.json({ mensaje: "Inicio de sesión exitoso", token });
    });
});

// Ruta protegida para administradores
router.get("/auth/perfil", defaultMiddleware, (req, res) => {
    res.json({ mensaje: "Acceso a perfil permitido", usuario: req.usuario });
});

module.exports = router;
