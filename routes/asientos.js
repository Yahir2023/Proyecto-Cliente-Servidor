const express = require("express");
const router = express.Router();
const { connection } = require("../config/config.db"); // Importamos la conexión desde config.db

// Obtener todos los asientos
router.get('/asientos', (req, res) => {
    const query = 'SELECT * FROM asientos';
    connection.query(query, (err, results) => {
        if (err) {
            return res.status(500).send('Error al obtener los asientos');
        }
        res.status(200).json(results);
    });
});

// Agregar un nuevo asiento
router.post('/asientos', (req, res) => {
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
router.delete('/asientos/:id', (req, res) => {
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
