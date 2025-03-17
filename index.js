const express = require("express");
const path = require("path");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerFile = require("./swagger_output.json");
const app = express();

const whitelist = ['http://localhost:3000', 'http://localhost:4000'];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Estás en la BLACK LIST'));
    }
  }
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.use(express.static(path.join(__dirname, 'public')));

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
app.use(require('./routes/Funciones'));
app.use(require('./routes/Salas'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('El servidor escucha en el puerto ' + PORT);
});

module.exports = app;
