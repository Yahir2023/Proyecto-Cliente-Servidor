const express = require("express");
const dotenv = require("dotenv");
const { connection } = require("../config/config.db"); // Conexión a MySQL

dotenv.config();
const app = express();
app.use(express.json()); // Permite recibir JSON en las solicitudes

// Obtener todos los pagos
app.get("/pagos", (req, res) => {
    connection.query("SELECT * FROM Pagos", (error, results) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "Error al obtener los pagos" });
        } else {
            res.status(200).json(results);
        }
    });
});

// Agregar un pago
app.post("/pagos", (req, res) => {
    const { id_compra, metodo_pago, estado_pago, transaction_id, monto_pagado, paypal_email } = req.body;

    if (!id_compra || !metodo_pago || !estado_pago || !monto_pagado) {
        return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    connection.query(
        "INSERT INTO Pagos (id_compra, metodo_pago, estado_pago, transaction_id, monto_pagado, paypal_email) VALUES (?, ?, ?, ?, ?, ?)",
        [id_compra, metodo_pago, estado_pago, transaction_id, monto_pagado, paypal_email],
        (error, results) => {
            if (error) {
                console.error(error);
                res.status(500).json({ error: "Error al insertar el pago" });
            } else {
                res.status(201).json({ mensaje: "Pago añadido correctamente", id_pago: results.insertId });
            }
        }
    );
});

// Actualizar un pago por ID
app.put("/pagos/:id", (req, res) => {
    const id_pago = req.params.id;
    const { estado_pago } = req.body;

    if (!estado_pago) {
        return res.status(400).json({ error: "El estado del pago es obligatorio" });
    }

    connection.query(
        "UPDATE Pagos SET estado_pago = ?, updated_at = NOW() WHERE id_pago = ?",
        [estado_pago, id_pago],
        (error, results) => {
            if (error) {
                console.error(error);
                res.status(500).json({ error: "Error al actualizar el pago" });
            } else if (results.affectedRows === 0) {
                res.status(404).json({ error: "Pago no encontrado" });
            } else {
                res.status(200).json({ mensaje: "Pago actualizado correctamente" });
            }
        }
    );
});

// Eliminar un pago por ID
app.delete("/pagos/:id", (req, res) => {
    const id_pago = req.params.id;

    connection.query("DELETE FROM Pagos WHERE id_pago = ?", [id_pago], (error, results) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: "Error al eliminar el pago" });
        } else if (results.affectedRows === 0) {
            res.status(404).json({ error: "Pago no encontrado" });
        } else {
            res.status(200).json({ mensaje: "Pago eliminado correctamente" });
        }
    });
});

module.exports = app;
