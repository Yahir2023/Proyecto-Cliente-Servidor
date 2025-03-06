require('dotenv').config(); 
const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
app.use(express.json());

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '', 
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
};

// Middleware de conexión a DB
const getConnection = async () => {
  return await mysql.createConnection(dbConfig);
};

// Endpoint para obtener historial de reservas
app.get('/reservas/:usuarioId', async (req, res) => {
  try {
    const connection = await getConnection();
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

    connection.end(); // Cerrar la conexión

    // Si no hay reservas, devolver un mensaje
    if (results.length === 0) {
      return res.status(200).json({ message: 'No tiene reservas' });
    }

    // Si hay reservas, devolver los resultados
    res.status(200).json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el historial' });
  }
});

// Endpoint para crear nueva reserva
app.post('/reservas', async (req, res) => {
  const { usuarioId, disponibilidadId } = req.body;

  if (!usuarioId || !disponibilidadId) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  let connection;
  try {
    connection = await getConnection();
    await connection.beginTransaction();

    // Verificar disponibilidad
    const [disponibilidad] = await connection.execute(
      'SELECT estado FROM disponibilidad_asientos WHERE id_disponibilidad = ? FOR UPDATE',
      [disponibilidadId]
    );

    if (disponibilidad.length === 0 || disponibilidad[0].estado !== 'disponible') {
      await connection.rollback();
      connection.end();
      return res.status(400).json({ error: 'Asiento no disponible' });
    }

    // Crear reserva
    await connection.execute(
      'INSERT INTO reservas (id_usuario, id_disponibilidad, estado) VALUES (?, ?, "activa")',
      [usuarioId, disponibilidadId]
    );

    // Actualizar disponibilidad
    await connection.execute(
      'UPDATE disponibilidad_asientos SET estado = "reservado" WHERE id_disponibilidad = ?',
      [disponibilidadId]
    );

    await connection.commit(); // Confirmar transacción
    connection.end(); // Cerrar la conexión
    res.status(201).json({ message: 'Reserva creada exitosamente' });
  } catch (error) {
    console.error(error);
    if (connection) {
      await connection.rollback(); // Revertir transacción en caso de error
      connection.end();
    }
    res.status(500).json({ error: 'Error al crear la reserva' });
  }
});

// Endpoint para eliminar una reserva
app.delete('/reservas/:id_reserva', async (req, res) => {
  const { id_reserva } = req.params;

  if (!id_reserva) {
    return res.status(400).json({ error: 'Se requiere el ID de la reserva' });
  }

  let connection;
  try {
    connection = await getConnection();
    await connection.beginTransaction();

    // Verificar si la reserva existe
    const [reserva] = await connection.execute(
      'SELECT * FROM reservas WHERE id_reserva = ?',
      [id_reserva]
    );

    if (reserva.length === 0) {
      await connection.rollback();
      connection.end();
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    // Eliminar la reserva
    await connection.execute(
      'DELETE FROM reservas WHERE id_reserva = ?',
      [id_reserva]
    );

    // Actualizar la disponibilidad del asiento
    await connection.execute(
      'UPDATE disponibilidad_asientos SET estado = "disponible" WHERE id_disponibilidad = ?',
      [reserva[0].id_disponibilidad]
    );

    await connection.commit(); // Confirmar transacción
    connection.end(); // Cerrar la conexión
    res.status(200).json({ message: 'Reserva eliminada exitosamente' });
  } catch (error) {
    console.error(error);
    if (connection) {
      await connection.rollback(); // Revertir transacción en caso de error
      connection.end();
    }
    res.status(500).json({ error: 'Error al eliminar la reserva' });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
