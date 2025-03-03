require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors"); // Importar CORS

const app = express();
app.use(cors()); // Habilitar CORS para evitar bloqueos en el frontend
app.use(express.json());

// Configurar conexión a MySQL con variables de entorno
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "cinedb"
});

// Conectar a MySQL
db.connect(err => {
    if (err) {
        console.error("Error conectando a la base de datos:", err);
        process.exit(1); // Detener el servidor si hay error
    } else {
        console.log("Conectado a MySQL");
    }
});

// Ruta para obtener los usuarios registrados
app.get("/usuarios", (req, res) => {
    const query = "SELECT id_usuario, nombre, apellido, correo FROM usuarios";
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: "Error en el servidor" });
        }
        res.json({ success: true, usuarios: results });
    });
});

// Iniciar servidor en puerto 3000 o el definido en el .env
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Servidor corriendo en http://127.0.0.1:${PORT}');
});