const express = require("express");
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Cargar el archivo de rutas
app.use(require('./routes/Usuarios'));
app.use(require('./routes/Pagos'));
app.use(require('./routes/Peliculas'));
app.use(require('./routes/Promociones'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('El servidor escucha en el puerto ' + PORT);
});

module.exports = app;