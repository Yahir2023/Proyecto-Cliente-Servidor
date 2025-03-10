const express = require("express");
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

// Rutas existentes
app.use(require('./routes/Usuarios'));
app.use(require('./routes/Pagos'));
app.use(require('./routes/Peliculas'));
app.use(require('./routes/Promociones'));
app.use(require('./routes/Admin'));
app.use(require('./routes/Login'));
app.use(require('./routes/Reservas'));
app.use(require('./routes/boletos'));
app.use(require('./routes/compras'));
app.use(require('./routes/Asientos'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('El servidor escucha en el puerto ' + PORT);
});

module.exports = app;
