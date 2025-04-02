const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
app.use(express.json());

const jwt = require("jsonwebtoken");
const secretKey = process.env.SECRET_KEY || "secreto_super_seguro";

const { connection } = require("../config/config.db");

// Para manejar la subida de archivos
const multer = require("multer");
const path = require("path");

// Configuración de Multer para almacenar archivos en la carpeta "images"
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images/"); // Guarda los archivos en la carpeta "images"
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Renombra el archivo con la fecha actual
  },
});
const upload = multer({ storage });

// Servir la carpeta "images" de forma estática
app.use("/images", express.static("images"));

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

const getPeliculas = (req, res) => {
  const { titulo, genero, clasificacion } = req.query;
  let query = "SELECT id_pelicula, titulo, duracion, clasificacion, sinopsis, director, genero, ruta_imagen, created_at, updated_at FROM peliculas WHERE 1=1";
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
    if (error)
      return res.status(500).json({ mensaje: "Error al obtener películas" });
    res.status(200).json(results);
  });
};

const getAllPeliculas = (req, res) => {
  const query = "SELECT id_pelicula, titulo, duracion, clasificacion, sinopsis, director, genero, ruta_imagen, created_at, updated_at FROM peliculas";
  connection.query(query, (error, results) => {
    if (error)
      return res.status(500).json({ mensaje: "Error al obtener películas" });
    res.status(200).json(results);
  });
};

const postPelicula = (req, res) => {
  //console.log("Body recibido:", req.body);
  //console.log("Headers:", req.headers);

  const { titulo, duracion, clasificacion, sinopsis, director, genero, ruta_imagen } = req.body;

  if (!ruta_imagen) {
    return res.status(400).json({ mensaje: "La ruta de la imagen es obligatoria", body: req.body });
  }

  const query = `
    INSERT INTO peliculas 
    (titulo, duracion, clasificacion, sinopsis, director, genero, ruta_imagen) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  connection.query(
    query,
    [titulo, duracion, clasificacion, sinopsis, director, genero, ruta_imagen],
    (error, results) => {
      if (error)
        return res.status(500).json({ mensaje: "Error al agregar la película" });
      res.status(201).json({
        mensaje: "Película añadida correctamente",
        affectedRows: results.affectedRows,
      });
    }
  );
};

const putPelicula = (req, res) => {
  const { id } = req.params;
  const { titulo, duracion, clasificacion, sinopsis, director, genero, ruta_imagen } = req.body;

  const query = `
    UPDATE peliculas 
    SET titulo = ?, duracion = ?, clasificacion = ?, sinopsis = ?, director = ?, genero = ?, ruta_imagen = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id_pelicula = ?
  `;
  connection.query(
    query,
    [titulo, duracion, clasificacion, sinopsis, director, genero, ruta_imagen, id],
    (error, results) => {
      if (error)
        return res.status(500).json({ mensaje: "Error al actualizar la película" });
      if (results.affectedRows === 0)
        return res.status(404).json({ mensaje: "Película no encontrada" });
      res.status(200).json({ mensaje: "Película actualizada correctamente" });
    }
  );
};


const deletePelicula = (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM peliculas WHERE id_pelicula = ?";

  connection.query(query, [id], (error, results) => {
    if (error)
      return res.status(500).json({ mensaje: "Error al eliminar la película" });
    if (results.affectedRows === 0)
      return res.status(404).json({ mensaje: "Película no encontrada para eliminar" });
    res.status(200).json({ mensaje: "Película eliminada correctamente" });
  });
};

app.post("/admin/peliculas/upload", authMiddleware, adminMiddleware, upload.single("imagen"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ mensaje: "No se ha subido ninguna imagen" });
  }
  // Construimos la ruta de la imagen
  const rutaImagen = `/images/${req.file.filename}`;
  res.status(200).json({ mensaje: "Imagen subida con éxito", rutaImagen });
});

// Rutas públicas para ver películas
app.route("/peliculas").get(getPeliculas);

// Rutas para administradores (deben enviar token válido)
app
  .route("/admin/peliculas")
  .get(authMiddleware, adminMiddleware, getAllPeliculas)
  .post(authMiddleware, adminMiddleware, postPelicula);

app
  .route("/peliculas/:id")
  .put(authMiddleware, adminMiddleware, putPelicula)
  .delete(authMiddleware, adminMiddleware, deletePelicula);

module.exports = app;
