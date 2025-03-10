const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { connection } = require("../config/config.db");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();
const secretKey = process.env.SECRET_KEY || "secreto_super_seguro";

// Middleware para verificar JWT en rutas protegidas
const authMiddleware = (req, res, next) => {
    let token = req.header("Authorization");
    if (!token) return res.status(401).json({ mensaje: "Acceso denegado. No hay token." });
    
    if (token.startsWith("Bearer ")) {
        token = token.slice(7).trim();
    }
    try {
        const decoded = jwt.verify(token, secretKey);
        req.usuario = decoded; // { id, isAdmin, correo, rol }
        next();
    } catch (error) {
        return res.status(401).json({ mensaje: "Token no válido" });
    }
};

// Endpoint unificado para login
router.post("/auth/login", (req, res) => {
    const { correo, contraseña } = req.body;

    if (!correo || !contraseña) {
        return res.status(400).json({ mensaje: "Correo y contraseña son requeridos." });
    }

    // Primero buscar en la tabla de administradores
    connection.query("SELECT * FROM administradores WHERE correo = ?", [correo], async (err, adminResults) => {
        if (err) return res.status(500).json({ mensaje: "Error en la base de datos." });
        
        if (adminResults.length > 0) {
            const admin = adminResults[0];
            const validPassword = await bcrypt.compare(contraseña, admin.contraseña);
            if (!validPassword) {
                return res.status(400).json({ mensaje: "Credenciales incorrectas." });
            }
            
            // Generar token para administrador
            const token = jwt.sign(
                { id: admin.id_admin, correo: admin.correo, isAdmin: true, rol: admin.rol },
                secretKey,
                { expiresIn: "1h" }
            );
            return res.json({ mensaje: "Inicio de sesión exitoso (admin).", token });
        }

        // Si no es admin, buscar en la tabla de usuarios
        connection.query("SELECT * FROM usuarios WHERE correo = ?", [correo], async (err, userResults) => {
            if (err) return res.status(500).json({ mensaje: "Error en la base de datos." });
            if (userResults.length === 0) return res.status(400).json({ mensaje: "Credenciales incorrectas." });

            const usuario = userResults[0];
            const validPassword = await bcrypt.compare(contraseña, usuario.contraseña);
            if (!validPassword) {
                return res.status(400).json({ mensaje: "Credenciales incorrectas." });
            }
            
            // Generar token para usuario normal
            const token = jwt.sign(
                { id: usuario.id_usuario, correo: usuario.correo, isAdmin: false },
                secretKey,
                { expiresIn: "1h" }
            );
            return res.json({ mensaje: "Inicio de sesión exitoso.", token });
        });
    });
});

// Ruta protegida para obtener perfil
router.get("/auth/perfil", authMiddleware, (req, res) => {
    res.json({ mensaje: "Acceso a perfil permitido.", usuario: req.usuario });
});

module.exports = router;
