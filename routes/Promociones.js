const express = require("express");
const router = express.Router();


const { connection } = require("../config/config.db");


router.get("/promociones", (req, res) => {
  const { search } = req.query;
  
  let query = "SELECT * FROM promociones WHERE 1=1";
  const params = [];

  if (search) {
    query += " AND descripcion LIKE ?";
    params.push(`%${search}%`);
  }
  
  connection.query(query, params, (error, results) => {
    if (error) {
      console.error("Error al obtener promociones:", error);
      return res.status(500).json({ error: "Error al obtener promociones" });
    }
    res.status(200).json(results);
  });
});

router.post("/promociones", (req, res) => {
  const {
    descripcion,
    tipo_descuento,
    valor_descuento,
    fecha_inicio,
    fecha_fin
  } = req.body;

  const query = `
    INSERT INTO promociones 
      (descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin, created_at, updated_at) 
    VALUES (?, ?, ?, ?, ?, NOW(), NOW())
  `;

  connection.query(
    query,
    [descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin],
    (error, results) => {
      if (error) {
        console.error("Error al insertar promoción:", error);
        return res.status(500).json({ error: "Error al insertar promoción" });
      }
      res.status(201).json({
        mensaje: "Promoción agregada correctamente",
        id_promocion: results.insertId
      });
    }
  );
});

router.put("/promociones/:id", (req, res) => {
  const { id } = req.params;
  const {
    descripcion,
    tipo_descuento,
    valor_descuento,
    fecha_inicio,
    fecha_fin
  } = req.body;

  const query = `
    UPDATE promociones
    SET
      descripcion = ?,
      tipo_descuento = ?,
      valor_descuento = ?,
      fecha_inicio = ?,
      fecha_fin = ?,
      updated_at = NOW()
    WHERE id_promocion = ?
  `;

  connection.query(
    query,
    [descripcion, tipo_descuento, valor_descuento, fecha_inicio, fecha_fin, id],
    (error, results) => {
      if (error) {
        console.error("Error al actualizar la promoción:", error);
        return res.status(500).json({ error: "Error al actualizar la promoción" });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ error: "No se encontró la promoción para actualizar" });
      }
      res.status(200).json({ mensaje: "Promoción actualizada correctamente" });
    }
  );
});

router.delete("/promociones/:id", (req, res) => {
  const { id } = req.params;

  const query = "DELETE FROM promociones WHERE id_promocion = ?";
  
  connection.query(query, [id], (error, results) => {
    if (error) {
      console.error("Error al eliminar la promoción:", error);
      return res.status(500).json({ error: "Error al eliminar la promoción" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "No se encontró la promoción para eliminar" });
    }
    res.status(200).json({ mensaje: "Promoción eliminada correctamente" });
  });
});

module.exports = router;
