const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const router = express.Router();
const secretKey = process.env.SECRET_KEY || "secreto";

// Registro de usuario
router.post("/register", (req, res) => {
    const { nombre, apellido, correo, contraseña } = req.body;
    const hash = bcrypt.hashSync(contraseña, 10);
    
    db.query(
        "INSERT INTO usuarios (nombre, apellido, correo, contraseña) VALUES (?, ?, ?, ?)",
        [nombre, apellido, correo, hash],
        (err, result) => {
            if (err) return res.status(500).json({ mensaje: "Error en el registro" });
            res.json({ mensaje: "Usuario registrado con éxito" });
        }
    );
});

// Inicio de sesión
router.post("/login", (req, res) => {
    const { correo, contraseña } = req.body;
    
    db.query("SELECT * FROM usuarios WHERE correo = ?", [correo], (err, results) => {
        if (err || results.length === 0) return res.status(400).json({ mensaje: "Credenciales incorrectas" });

        const usuario = results[0];
        const validPassword = bcrypt.compareSync(contraseña, usuario.contraseña);
        if (!validPassword) return res.status(400).json({ mensaje: "Credenciales incorrectas" });

        const token = jwt.sign({ id: usuario.id, correo: usuario.correo }, secretKey, { expiresIn: "1h" });
        res.json({ mensaje: "Inicio de sesión exitoso", token });
    });
});

// Middleware de autenticación
const verificarToken = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ mensaje: "Acceso denegado" });

    try {
        const verificado = jwt.verify(token.split(" ")[1], secretKey);
        req.usuario = verificado;
        next();
    } catch (err) {
        res.status(400).json({ mensaje: "Token no válido" });
    }
};

// Ruta protegida
router.get("/perfil", verificarToken, (req, res) => {
    res.json({ mensaje: "Acceso a perfil permitido", usuario: req.usuario });
});

module.exports = router;
