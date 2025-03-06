// db.js
const mysql = require('mysql');
require('dotenv').config(); // Cargar variables de entorno

// Conectar a la base de datos utilizando las variables de entorno
const connection = mysql.createConnection({
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASS,
    database: process.env.DBNAME
});

connection.connect((err) => {
    if (err) {
        console.error('Error de conexión: ' + err.stack);
        return;
    }
    console.log('Conectado a la base de datos');
});

module.exports = connection;
