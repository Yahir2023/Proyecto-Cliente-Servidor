// app.js
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 3000;
const asientosRoutes = require('./routes/asientos');

// Middleware para parsear los datos del cuerpo de las solicitudes
app.use(bodyParser.json());
app.use(express.json());

// Rutas
app.use('/api', asientosRoutes);

// Servir archivos estáticos (opcional)
app.use(express.static('public'));

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
