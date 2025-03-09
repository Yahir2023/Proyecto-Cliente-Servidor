const express = require("express");
const path = require("path");
const dotenv = require("dotenv").config();

const app = express();

// Middlewares para parsear JSON y datos URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rutas existentes
app.use(require('./routes/Usuarios'));
app.use(require('./routes/Pagos'));
app.use(require('./routes/Peliculas'));
app.use(require('./routes/Promociones'));
app.use(require('./routes/asientos'));

// Rutas API adicionales
const authRoutes = require("./routes/Login");
app.use("/api", authRoutes);

const reservasRoutes = require("./routes/Reservas");
app.use("/api", reservasRoutes);

// Ruta de asientos
const asientosRoutes = require("./routes/asientos");
app.use("/api", asientosRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('El servidor escucha en el puerto ' + PORT);
});

module.exports = app;
