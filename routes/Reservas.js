const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const { connection } = require("../config/config.db");

// Endpoint para obtener historial de reservas
router.get('/reservas/:usuarioId', (req, res) => {
  connection.query(
    `SELECT r.*, f.fecha_hora, p.titulo as pelicula, s.nombre as sala 
    FROM reservas r
    JOIN disponibilidad_asientos da ON r.id_disponibilidad = da.id_disponibilidad
    JOIN funciones f ON da.id_funcion = f.id_funcion
    JOIN peliculas p ON f.id_pelicula = p.id_pelicula
    JOIN salas s ON f.id_sala = s.id_sala
    WHERE r.id_usuario = ?`, 
    [req.params.usuarioId], 
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al obtener el historial' });
      }

      if (results.length === 0) {
        return res.status(200).json({ message: 'No tiene reservas' });
      }

      res.status(200).json(results);
    }
  );
});

// Endpoint para crear nueva reserva
router.post('/reservas', (req, res) => {
  const { usuarioId, disponibilidadId } = req.body;

  if (!usuarioId || !disponibilidadId) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  let conn;
  connection.getConnection((err, connection) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener la conexión' });
    }
    conn = connection;

    conn.beginTransaction((err) => {
      if (err) {
        conn.release();
        console.error(err);
        return res.status(500).json({ error: 'Error al iniciar transacción' });
      }

      // Verificar disponibilidad del asiento
      conn.query(
        'SELECT estado FROM disponibilidad_asientos WHERE id_disponibilidad = ? FOR UPDATE',
        [disponibilidadId],
        (error, disponibilidad) => {
          if (error) {
            return conn.rollback(() => {
              conn.release();
              console.error(error);
              return res.status(500).json({ error: 'Error al verificar disponibilidad' });
            });
          }

          if (disponibilidad.length === 0 || disponibilidad[0].estado !== 'disponible') {
            return conn.rollback(() => {
              conn.release();
              return res.status(400).json({ error: 'Asiento no disponible' });
            });
          }

          // Crear reserva
          conn.query(
            'INSERT INTO reservas (id_usuario, id_disponibilidad, estado) VALUES (?, ?, "activa")',
            [usuarioId, disponibilidadId],
            (error) => {
              if (error) {
                return conn.rollback(() => {
                  conn.release();
                  console.error(error);
                  return res.status(500).json({ error: 'Error al crear la reserva' });
                });
              }

              // Actualizar disponibilidad del asiento
              conn.query(
                'UPDATE disponibilidad_asientos SET estado = "reservado" WHERE id_disponibilidad = ?',
                [disponibilidadId],
                (error) => {
                  if (error) {
                    return conn.rollback(() => {
                      conn.release();
                      console.error(error);
                      return res.status(500).json({ error: 'Error al actualizar disponibilidad' });
                    });
                  }

                  conn.commit((err) => {
                    if (err) {
                      return conn.rollback(() => {
                        conn.release();
                        console.error(err);
                        return res.status(500).json({ error: 'Error al confirmar la reserva' });
                      });
                    }

                    conn.release();
                    res.status(201).json({ message: 'Reserva creada exitosamente' });
                  });
                }
              );
            }
          );
        }
      );
    });
  });
});

// Endpoint para eliminar una reserva
router.delete('/reservas/:id_reserva', (req, res) => {
  const { id_reserva } = req.params;

  if (!id_reserva) {
    return res.status(400).json({ error: 'Se requiere el ID de la reserva' });
  }

  let conn;
  connection.getConnection((err, connection) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener la conexión' });
    }
    conn = connection;

    conn.beginTransaction((err) => {
      if (err) {
        conn.release();
        console.error(err);
        return res.status(500).json({ error: 'Error al iniciar transacción' });
      }

      // Verificar si la reserva existe
      conn.query(
        'SELECT * FROM reservas WHERE id_reserva = ?',
        [id_reserva],
        (error, reserva) => {
          if (error) {
            return conn.rollback(() => {
              conn.release();
              console.error(error);
              return res.status(500).json({ error: 'Error al verificar la reserva' });
            });
          }

          if (reserva.length === 0) {
            return conn.rollback(() => {
              conn.release();
              return res.status(404).json({ error: 'Reserva no encontrada' });
            });
          }

          // Eliminar la reserva
          conn.query(
            'DELETE FROM reservas WHERE id_reserva = ?',
            [id_reserva],
            (error) => {
              if (error) {
                return conn.rollback(() => {
                  conn.release();
                  console.error(error);
                  return res.status(500).json({ error: 'Error al eliminar la reserva' });
                });
              }

              // Actualizar la disponibilidad del asiento
              conn.query(
                'UPDATE disponibilidad_asientos SET estado = "disponible" WHERE id_disponibilidad = ?',
                [reserva[0].id_disponibilidad],
                (error) => {
                  if (error) {
                    return conn.rollback(() => {
                      conn.release();
                      console.error(error);
                      return res.status(500).json({ error: 'Error al actualizar disponibilidad' });
                    });
                  }

                  conn.commit((err) => {
                    if (err) {
                      return conn.rollback(() => {
                        conn.release();
                        console.error(err);
                        return res.status(500).json({ error: 'Error al confirmar la eliminación' });
                      });
                    }

                    conn.release();
                    res.status(200).json({ message: 'Reserva eliminada exitosamente' });
                  });
                }
              );
            }
          );
        }
      );
    });
  });
});

module.exports = router;
