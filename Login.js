require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// Configurar conexión a MySQL
const db = mysql.createConnection({
    host: "localhost",
    user: "root", // Cambia por tu usuario de MySQL
    password: "", // Cambia por tu contraseña de MySQL
    database: "cinedb"
});

// Conectar a MySQL
db.connect(err => {
    if (err) {
        console.error("Error conectando a la base de datos:", err);
    } else {
        console.log("Conectado a MySQL");
    }
});

// Ruta para inicio de sesión
app.post("/login", (req, res) => {
    const { correo, contraseña } = req.body;

    const query = "SELECT nombre, apellido, correo FROM usuarios WHERE correo = ? AND contraseña = ?";
    db.query(query, [correo, contraseña], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Error en el servidor" });
        }
        if (results.length > 0) {
            res.json({ success: true, message: "Inicio de sesión exitoso", user: results[0] });
        } else {
            res.status(401).json({ success: false, message: "Credenciales incorrectas" });
        }
    });
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log('El servidor escucha en el puerto '+ PORT);
});