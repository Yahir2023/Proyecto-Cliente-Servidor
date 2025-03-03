require("dotenv").config();
const express = require("express");
const cors = require("cors"); // Importar CORS
const { connection: db } = require("./config/config.db"); // Importar la configuración de la base de datos

const app = express();
app.use(cors()); // Habilitar CORS para evitar bloqueos en el frontend
app.use(express.json());

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
    console.log(`Servidor corriendo en http://127.0.0.1:${PORT}`);
});