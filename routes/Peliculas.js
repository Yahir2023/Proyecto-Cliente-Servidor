const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
app.use(express.json());

const jwt = require("jsonwebtoken");
const secretKey = process.env.SECRET_KEY || "secreto_super_seguro";

const { connection } = require("../config/config.db");

// Middleware para validar el token JWT
const authMiddleware = (req, res, next) => {
  let token = req.header("Authorization");
  if (!token) {
    return res.status(401).json({ mensaje: "Acceso denegado. No hay token." });
  }
  if (token.startsWith("Bearer ")) {
    token = token.slice(7).trim();
  }
  try {
    const decoded = jwt.verify(token, secretKey);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: "Token no válido" });
  }
};

// Middleware para validar que el usuario es administrador
const adminMiddleware = (req, res, next) => {
  if (!req.usuario.isAdmin) {
    return res.status(403).json({ mensaje: "Acceso denegado. Solo administradores pueden realizar esta acción." });
  }
  next();
};

// Solo accesible para administradores
const getAllPeliculas = (req, res) => {
  const query = "SELECT * FROM peliculas";
  connection.query(query, (error, results) => {
    if (error) return res.status(500).json({ mensaje: "Error al obtener películas" });
    res.status(200).json(results);
  });
};

/**
 * GET /peliculas
 * Permite filtrar películas por título, género y clasificación.
 * Disponible para cualquier usuario autenticado.
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
    if (error) return res.status(500).json({ mensaje: "Error al obtener películas" });
    res.status(200).json(results);
  });
};

/**
 * POST /peliculas
 * Permite agregar una nueva película.
 * Solo accesible para administradores.
 *
 * Se espera un body con la siguiente estructura:
 * {
 *   "titulo": "string",
 *   "duracion": "number",
 *   "clasificacion": "string",
 *   "sinopsis": "string",
 *   "director": "string",
 *   "genero": "string"
 * }
 */
const postPelicula = (req, res) => {
  const { titulo, duracion, clasificacion, sinopsis, director, genero } = req.body;

  const query = `
    INSERT INTO peliculas 
    (titulo, duracion, clasificacion, sinopsis, director, genero) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  connection.query(query, [titulo, duracion, clasificacion, sinopsis, director, genero], (error, results) => {
    if (error) return res.status(500).json({ mensaje: "Error al agregar la película" });
    res.status(201).json({ mensaje: "Película añadida correctamente", affectedRows: results.affectedRows });
  });
};

/**
 * PUT /peliculas/:id
 * Permite actualizar una película.
 * Solo accesible para administradores.
 */
const putPelicula = (req, res) => {
  const { id } = req.params;
  const { titulo, duracion, clasificacion, sinopsis, director, genero } = req.body;

  const query = `
    UPDATE peliculas 
    SET titulo = ?, duracion = ?, clasificacion = ?, sinopsis = ?, director = ?, genero = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id_pelicula = ?
  `;
  connection.query(query, [titulo, duracion, clasificacion, sinopsis, director, genero, id], (error, results) => {
    if (error) return res.status(500).json({ mensaje: "Error al actualizar la película" });
    if (results.affectedRows === 0) return res.status(404).json({ mensaje: "Película no encontrada" });
    res.status(200).json({ mensaje: "Película actualizada correctamente" });
  });
};

/**
 * DELETE /peliculas/:id
 * Permite eliminar una película.
 * Solo accesible para administradores.
 */
const deletePelicula = (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM peliculas WHERE id_pelicula = ?";

  connection.query(query, [id], (error, results) => {
    if (error) return res.status(500).json({ mensaje: "Error al eliminar la película" });
    if (results.affectedRows === 0) return res.status(404).json({ mensaje: "Película no encontrada para eliminar" });
    res.status(200).json({ mensaje: "Película eliminada correctamente" });
  });
};

app.route("/peliculas")
   .get(authMiddleware, getPeliculas)
   .post(authMiddleware, adminMiddleware, postPelicula);

app.route("/peliculas/:id")
   .put(authMiddleware, adminMiddleware, putPelicula)
   .delete(authMiddleware, adminMiddleware, deletePelicula);

module.exports = app;
