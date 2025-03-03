const express = require("express");
const app = express();

const dotenv = require("dotenv");
dotenv.config();

//conexión con la base de datos
const {connection} = require("../config/config.db");

const getPagos = (request, response) => {
    connection.query(
        "SELECT * FROM Pagos",
        (error, results) => {
            if (error) {
                console.error(error);
                response.status(500).json({ error: "Error al obtener los pagos" });
            } else {
                response.status(200).json(results);
            }
        }
    );
};

const postPago = (request, response) => {
    const { id_compra, metodo_pago, estado_pago, transaction_id, monto_pagado, paypal_email } = request.body;
    connection.query(
        "INSERT INTO Pagos (id_compra, metodo_pago, estado_pago, transaction_id, monto_pagado, paypal_email) VALUES (?, ?, ?, ?, ?, ?)",
        [id_compra, metodo_pago, estado_pago, transaction_id, monto_pagado, paypal_email],
        (error, results) => {
            if (error) {
                console.error(error);
                response.status(500).json({ error: "Error al insertar el pago" });
            } else {
                response.status(201).json({ mensaje: "Pago añadido correctamente", filas_afectadas: results.affectedRows });
            }
        }
    );
};

app.route("/pagos").get(getPagos);
app.route("/pagos").post(postPago);
module.exports = app;