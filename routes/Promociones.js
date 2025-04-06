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

// Configuración de Multer para almacenar archivos en la carpeta "images/promociones"
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images/promociones"); // Guarda los archivos en "images/promociones"
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Renombra el archivo con la fecha actual y su extensión
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
    req.usuario = decoded; // Se espera que el token incluya { id, isAdmin, ... }
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

// Endpoint público para obtener promociones
const getPromociones = (req, res) => {
  const query = "SELECT * FROM promociones";
  connection.query(query, (error, results) => {
    if (error) return res.status(500).json({ mensaje: "Error al obtener promociones" });
    res.status(200).json(results);
  });
};

// Endpoint para que el administrador agregue una nueva promoción (sin imagen)
const postPromocion = (req, res) => {
  const { descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin, ruta_imagen } = req.body;

  if (!ruta_imagen) {
    return res.status(400).json({ mensaje: "La ruta de la imagen es obligatoria", body: req.body });
  }

  const query = `
    INSERT INTO promociones 
    (descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin, ruta_imagen, created_at, updated_at) 
    VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;
  connection.query(
    query,
    [descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin, ruta_imagen],
    (error, results) => {
      if (error) return res.status(500).json({ mensaje: "Error al agregar la promoción" });
      res.status(201).json({
        mensaje: "Promoción añadida correctamente",
        id_promocion: results.insertId,
      });
    }
  );
};

// Endpoint para actualizar una promoción
const putPromocion = (req, res) => {
  const { id } = req.params;
  const { descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin, ruta_imagen } = req.body;

  const query = `
    UPDATE promociones
    SET descripcion = ?, tipo_descuento = ?, valor_descuento = ?, fecha_inicio = ?, fecha_fin = ?, ruta_imagen = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id_promocion = ?
  `;
  connection.query(
    query,
    [descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin, ruta_imagen, id],
    (error, results) => {
      if (error) return res.status(500).json({ mensaje: "Error al actualizar la promoción" });
      if (results.affectedRows === 0) return res.status(404).json({ mensaje: "Promoción no encontrada" });
      res.status(200).json({ mensaje: "Promoción actualizada correctamente" });
    }
  );
};

// Endpoint para eliminar una promoción
const deletePromocion = (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM promociones WHERE id_promocion = ?";
  connection.query(query, [id], (error, results) => {
    if (error) return res.status(500).json({ mensaje: "Error al eliminar la promoción" });
    if (results.affectedRows === 0) return res.status(404).json({ mensaje: "Promoción no encontrada para eliminar" });
    res.status(200).json({ mensaje: "Promoción eliminada correctamente" });
  });
};

// Endpoint para subir una imagen para promociones (sólo administradores)
app.post("/admin/promociones/upload", authMiddleware, adminMiddleware, upload.single("imagen"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ mensaje: "No se ha subido ninguna imagen" });
  }
  // Construimos la ruta de la imagen. Ejemplo: /images/promociones/1645678901234.jpg
  const rutaImagen = `/images/promociones/${req.file.filename}`;
  res.status(200).json({ mensaje: "Imagen subida con éxito", rutaImagen });
});

app.get("/promociones", getPromociones);

app.route("/admin/promociones")
  .get(authMiddleware, adminMiddleware, (req, res) => {
    const query = "SELECT * FROM promociones";
    connection.query(query, (error, results) => {
      if (error) return res.status(500).json({ mensaje: "Error al obtener promociones" });
      res.status(200).json(results);
    });
  })
  .post(authMiddleware, adminMiddleware, postPromocion);

app.route("/promociones/:id")
  .put(authMiddleware, adminMiddleware, putPromocion)
  .delete(authMiddleware, adminMiddleware, deletePromocion);

module.exports = app;
