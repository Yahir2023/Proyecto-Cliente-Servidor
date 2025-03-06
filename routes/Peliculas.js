const express = require("express");
const app = express();

const dotenv = require("dotenv");
dotenv.config();
app.use(express.json());

// Importar la conexión a la base de datos
const { connection } = require("../config/config.db");

/**
 Obtener películas con filtros opcionales por:
 título (ejemplo: ?titulo=Avengers)
 género (ejemplo: ?genero=Accion)
 clasificación (ejemplo: ?clasificacion=PG)
 */
const getPeliculas = (req, res) => {
  const { titulo, genero, clasificacion } = req.query;

  let query = "SELECT * FROM peliculas WHERE 1=1";
  let filters = [];

  if (titulo) {
    query += " AND titulo LIKE ?";
    filters.push(`%${titulo}%`);
  }

  if (genero) {
    query += " AND genero = ?";
    filters.push(genero);
  }

  if (clasificacion) {
    query += " AND clasificacion = ?";
    filters.push(clasificacion);
  }

  connection.query(query, filters, (error, results) => {
    if (error) throw error;
    res.status(200).json(results);
  });
};

/**
 {
 "titulo": "string",
 "duracion": "number",
 "clasificacion": "string",
 "sinopsis": "string",
 "director": "string",
 "genero": "string"
}
 */
const postPelicula = (req, res) => {
  const { titulo, duracion, clasificacion, sinopsis, director, genero } = req.body;

  const query = `
    INSERT INTO peliculas 
    (titulo, duracion, clasificacion, sinopsis, director, genero) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  connection.query(
    query,
    [titulo, duracion, clasificacion, sinopsis, director, genero],
    (error, results) => {
      if (error) throw error;
      res.status(201).json({ "Pelicula añadida correctamente": results.affectedRows });
    }
  );
};

const deletePelicula = (req, res) => {
  const { id } = req.params;

  const query = "DELETE FROM peliculas WHERE id_pelicula = ?";

  connection.query(query, [id], (error, results) => {
    if (error) throw error;

    // Si no se encontró la película
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "No se encontró la película para eliminar" });
    }

    res.status(200).json({ mensaje: "Película eliminada correctamente" });
  });
};

app.route("/peliculas")
   .get(getPeliculas)
   .post(postPelicula);

app.route("/peliculas/:id")
   .delete(deletePelicula);

module.exports = app;
