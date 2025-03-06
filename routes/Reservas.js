// routes/reservas.js
const express = require('express');
const router = express.Router();
const { connection } = require('../config/config.db');

// Endpoint para obtener historial de reservas por usuario
router.get('/reservas/:usuarioId', async (req, res) => {
  try {
    const [results] = await connection.execute(
      `
      SELECT r.*, f.fecha_hora, p.titulo as pelicula, s.nombre as sala 
      FROM reservas r
      JOIN disponibilidad_asientos da ON r.id_disponibilidad = da.id_disponibilidad
      JOIN funciones f ON da.id_funcion = f.id_funcion
      JOIN peliculas p ON f.id_pelicula = p.id_pelicula
      JOIN salas s ON f.id_sala = s.id_sala
      WHERE r.id_usuario = ?
      `,
      [req.params.usuarioId]
    );

    if (results.length === 0) {
      return res.status(200).json({ message: 'No tiene reservas' });
    }

    res.status(200).json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el historial' });
  }
});

// Endpoint para crear nueva reserva
router.post('/reservas', async (req, res) => {
  const { usuarioId, disponibilidadId } = req.body;

  if (!usuarioId || !disponibilidadId) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  let conn;
  try {
    // Obtener una conexión del pool para manejar transacciones
    conn = await connection.getConnection();
    await conn.beginTransaction();

    // Verificar disponibilidad del asiento (bloqueando la fila)
    const [disponibilidad] = await conn.execute(
      'SELECT estado FROM disponibilidad_asientos WHERE id_disponibilidad = ? FOR UPDATE',
      [disponibilidadId]
    );

    if (disponibilidad.length === 0 || disponibilidad[0].estado !== 'disponible') {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: 'Asiento no disponible' });
    }

    // Crear reserva
    await conn.execute(
      'INSERT INTO reservas (id_usuario, id_disponibilidad, estado) VALUES (?, ?, "activa")',
      [usuarioId, disponibilidadId]
    );

    // Actualizar disponibilidad del asiento a "reservado"
    await conn.execute(
      'UPDATE disponibilidad_asientos SET estado = "reservado" WHERE id_disponibilidad = ?',
      [disponibilidadId]
    );

    await conn.commit();
    conn.release();
    res.status(201).json({ message: 'Reserva creada exitosamente' });
  } catch (error) {
    console.error(error);
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    res.status(500).json({ error: 'Error al crear la reserva' });
  }
});

// Endpoint para eliminar una reserva
router.delete('/reservas/:id_reserva', async (req, res) => {
  const { id_reserva } = req.params;

  if (!id_reserva) {
    return res.status(400).json({ error: 'Se requiere el ID de la reserva' });
  }

  let conn;
  try {
    conn = await connection.getConnection();
    await conn.beginTransaction();

    // Verificar si la reserva existe
    const [reserva] = await conn.execute(
      'SELECT * FROM reservas WHERE id_reserva = ?',
      [id_reserva]
    );

    if (reserva.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    // Eliminar la reserva
    await conn.execute(
      'DELETE FROM reservas WHERE id_reserva = ?',
      [id_reserva]
    );

    // Actualizar la disponibilidad del asiento a "disponible"
    await conn.execute(
      'UPDATE disponibilidad_asientos SET estado = "disponible" WHERE id_disponibilidad = ?',
      [reserva[0].id_disponibilidad]
    );

    await conn.commit();
    conn.release();
    res.status(200).json({ message: 'Reserva eliminada exitosamente' });
  } catch (error) {
    console.error(error);
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    res.status(500).json({ error: 'Error al eliminar la reserva' });
  }
});

module.exports = router;
