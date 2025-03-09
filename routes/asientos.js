const express = require("express");
const router = express.Router();
const mysql = require('mysql');
const dotenv = require("dotenv");
dotenv.config();

// Configuración de la base de datos
let connection;

try {
    connection = mysql.createConnection({
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        password: process.env.DBPASS,
        database: process.env.DBNAME
    });
} catch (error) {
    console.log("Error al conectar con la base de datos");
}

// Middleware para verificar token JWT para la ruta de asientos
const defaultMiddleware = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).json({ mensaje: "Acceso denegado" });

    try {
        const verificado = jwt.verify(token, process.env.SECRET_KEY || "secreto");
        req.usuario = verificado;

        // Verificar si el usuario tiene el rol adecuado (por ejemplo, 'admin')
        if (req.usuario.rol !== 'Gerente') {
            return res.status(403).json({ mensaje: "Acceso prohibido: solo administradores" });
        }

        next();
    } catch (err) {
        res.status(400).json({ mensaje: "Token no válido" });
    }
};

// Obtener todos los asientos
router.get('/asientos', defaultMiddleware, (req, res) => {
    const query = 'SELECT * FROM asientos';
    connection.query(query, (err, results) => {
        if (err) {
            return res.status(500).send('Error al obtener los asientos');
        }
        res.status(200).json(results);
    });
});

// Agregar un nuevo asiento
router.post('/asientos', defaultMiddleware, (req, res) => {
    const { id_sala, numero_asiento, fila, tipo_asiento } = req.body;

    const query = `
        INSERT INTO asientos (id_sala, numero_asiento, fila, tipo_asiento, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW());
    `;
    
    connection.query(query, [id_sala, numero_asiento, fila, tipo_asiento], (err, result) => {
        if (err) {
            console.error('Error al agregar el asiento:', err);
            return res.status(500).send('Error al agregar el asiento');
        }
        res.status(201).send('Asiento agregado correctamente');
    });
});

// Eliminar un asiento
router.delete('/asientos/:id', defaultMiddleware, (req, res) => {
    const id = req.params.id;
    const query = 'DELETE FROM asientos WHERE id_asiento = ?';
    
    connection.query(query, [id], (err, result) => {
        if (err) {
            return res.status(500).send('Error al eliminar el asiento');
        }
        if (result.affectedRows === 0) {
            return res.status(404).send('Asiento no encontrado');
        }
        res.status(200).send('Asiento eliminado correctamente');
    });
});

module.exports = router;
