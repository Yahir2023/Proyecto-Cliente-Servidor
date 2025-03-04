// server.js
const express = require('express');
const mysql = require('mysql');
const app = express();
const { connection: db } = require("./config/config.db");

// Middleware para parsear JSON
app.use(express.json());

// Conexión a MySQL
const connection = mysql.createConnection(dbConfig);
connection.connect(err => {
  if (err) {
    console.error('Error conectando a la base de datos:', err);
    process.exit(1);
  }
  console.log('Conectado a la base de datos MySQL.');
});

/**
 * Endpoint para registrar el pago.
 * Se espera recibir en el body JSON:
 * { id_compra, transaction_id, monto_pagado, paypal_email, metodo_pago }
 *
 * - Para pagos con PayPal se requiere paypal_email.
 * - Para pagos con tarjeta, paypal_email se enviará como null.
 * El pago se insertará con estado "completado".
 */
app.post('/api/register-payment', (req, res) => {
  const { id_compra, transaction_id, monto_pagado, paypal_email, metodo_pago } = req.body;
  
  // Validación básica de los datos mínimos
  if (!transaction_id || !monto_pagado || !metodo_pago) {
    return res.status(400).json({ error: 'Faltan datos para registrar el pago.' });
  }
  if(metodo_pago === 'PayPal' && !paypal_email) {
    return res.status(400).json({ error: 'Falta el correo de PayPal.' });
  }
  
  const estado_pago = 'completado';
  const compraId = id_compra || 0;

  const query = `
    INSERT INTO Pagos (id_compra, metodo_pago, estado_pago, transaction_id, monto_pagado, paypal_email)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  connection.query(query, [compraId, metodo_pago, estado_pago, transaction_id, monto_pagado, paypal_email], (error, results) => {
    if (error) {
      console.error('Error al insertar el pago:', error);
      return res.status(500).json({ error: 'Error al registrar el pago.' });
    }
    res.json({ message: 'Pago registrado exitosamente', paymentId: results.insertId });
  });
});

// Inicia el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
