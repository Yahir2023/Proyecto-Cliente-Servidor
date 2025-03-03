const express = require("express");
const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

//cargamos el archivo de rutas

app.use(require('./routes/Usuarios'));
app.use(require('./routes/Pagos'));


const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log('El servidor escucha en el puerto '+ PORT);
});

module.exports = app;