// asientosController.js
const db = require('../config/db.js');

// Obtener todos los asientos
exports.getAllAsientos = (req, res) => {
    const query = 'SELECT * FROM asientos';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).send('Error al obtener los asientos');
        }
        res.status(200).json(results);
    });
};

// Agregar un nuevo asiento
exports.addAsiento = (req, res) => {
    const { id_sala, numero_asiento, fila} = req.body;

    // Consulta para insertar un nuevo asiento
    const query = `
        INSERT INTO asientos (id_sala, numero_asiento, fila, created_at, updated_at)
        VALUES (?, ?, ?, NOW(), NOW())`;

    db.query(query, [id_sala, numero_asiento, fila], (err, result) => {
        if (err) {
            console.error('Error al agregar el asiento:', err);
            return res.status(500).send('Error al agregar el asiento');
        }
        res.status(201).send('Asiento agregado correctamente');
    });
};

// Eliminar un asiento
exports.deleteAsiento = (req, res) => {
    const id = req.params.id;
    const query = 'DELETE FROM asientos WHERE id_asiento = ?';
    db.query(query, [id], (err, result) => {
        if (err) {
            return res.status(500).send('Error al eliminar el asiento');
        }
        if (result.affectedRows === 0) {
            return res.status(404).send('Asiento no encontrado');
        }
        res.status(200).send('Asiento eliminado correctamente');
    });
};
