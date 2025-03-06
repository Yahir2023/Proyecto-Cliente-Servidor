const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("./config/db");
const dotenv = require("dotenv").config();
const app = express();

app.use(bodyParser.json());

const secretKey = process.env.SECRET_KEY || "secreto";

// Middleware para verificar JWT
defaultMiddleware = (req, res, next) => {
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

// Registro de usuario
app.post("/api/auth/register", (req, res) => {
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
app.post("/api/auth/login", (req, res) => {
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

// Ruta protegida
app.get("/api/auth/perfil", defaultMiddleware, (req, res) => {
    res.json({ mensaje: "Acceso a perfil permitido", usuario: req.usuario });
});

const movieRoutes = require('./routes/movieRoutes');
app.use('/api', movieRoutes);

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
