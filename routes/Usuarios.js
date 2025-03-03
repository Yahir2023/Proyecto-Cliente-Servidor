const express = require("express");
const app = express();

const dotenv = require("dotenv");
dotenv.config();

//conexión con la base de datos
const {connection} = require("../config/config.db");

const getUsuario = (request, response) => {
     connection.query("SELECT * FROM usuarios",
     (error, results) => {
          if(error)
              throw error;
          response.status(200).json(results);
     });
};

const postUsuario = (request, response) => {  
    const { nombre, apellido, correo, contraseña } = request.body; 
    connection.query(
        "INSERT INTO usuarios (nombre, apellido, correo, contraseña) VALUES (?, ?, ?, ?)",  
        [nombre, apellido, correo, contraseña], 
        (error, results) => { 
            if (error) throw error; 
            response.status(201).json({ "Usuario añadido correctamente": results.affectedRows }); 
        }
    ); 
};

app.route("/usuarios").post(postUsuario); 

//ruta
app.route("/usuarios").get(getUsuario);
module.exports = app;