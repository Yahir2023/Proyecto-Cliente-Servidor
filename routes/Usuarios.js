const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs"); // Importar bcryptjs
dotenv.config();

const { connection } = require("../config/config.db");

const app = express();

// Middleware para habilitar CORS y procesar JSON
app.use(cors());
app.use(express.json());

// Obtener todos los usuarios
const getUsuarios = (req, res) => {
    connection.query("SELECT * FROM usuarios", (error, results) => {
        if (error) throw error;
        res.status(200).json(results);
    });
};

// Agregar un nuevo usuario con contraseña encriptada
const postUsuario = async (req, res) => {
    try {
        const { nombre, apellido, correo, contraseña } = req.body;
        
        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10); // Generar "sal" para más seguridad
        const contraseñaEncriptada = await bcrypt.hash(contraseña, salt);
        
        connection.query(
            "INSERT INTO usuarios (nombre, apellido, correo, contraseña) VALUES (?, ?, ?, ?)",
            [nombre, apellido, correo, contraseñaEncriptada],
            (error, results) => {
                if (error) throw error;
                res.status(201).json({ mensaje: "Usuario añadido correctamente", id: results.insertId });
            }
        );
    } catch (error) {
        res.status(500).json({ mensaje: "Error al registrar usuario" });
    }
};

// Editar un usuario por ID (incluye actualización de contraseña encriptada)
const putUsuario = async (req, res) => {
    try {
        const { id_usuario } = req.params;
        const { nombre, apellido, correo, contraseña } = req.body;

        // Encriptar la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const contraseñaEncriptada = await bcrypt.hash(contraseña, salt);

        connection.query(
            "UPDATE usuarios SET nombre = ?, apellido = ?, correo = ?, contraseña = ? WHERE id_usuario = ?",
            [nombre, apellido, correo, contraseñaEncriptada, id_usuario],
            (error, results) => {
                if (error) throw error;
                if (results.affectedRows === 0) {
                    res.status(404).json({ mensaje: "Usuario no encontrado" });
                } else {
                    res.json({ mensaje: "Usuario actualizado correctamente" });
                }
            }
        );
    } catch (error) {
        res.status(500).json({ mensaje: "Error al actualizar usuario" });
    }
};

// Eliminar un usuario por ID
const deleteUsuario = (req, res) => {
    const { id_usuario } = req.params;
    connection.query("DELETE FROM usuarios WHERE id_usuario = ?", [id_usuario], (error, results) => {
        if (error) throw error;
        if (results.affectedRows === 0) {
            res.status(404).json({ mensaje: "Usuario no encontrado" });
        } else {
            res.json({ mensaje: "Usuario eliminado correctamente" });
        }
    });
};

// Definir las rutas
app.route("/usuarios").get(getUsuarios).post(postUsuario);
app.route("/usuarios/:id_usuario").put(putUsuario).delete(deleteUsuario);

module.exports = app;
