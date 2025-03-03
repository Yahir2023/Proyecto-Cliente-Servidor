// app.js
const express = require('express');
const app = express();
const PORT = 3000;

// Para poder leer JSON en el body de las peticiones
app.use(express.json());

// Servimos la carpeta 'public' como estática
app.use(express.static('public'));

// Datos de ejemplo: asientos en 5 filas (A-E) con 6 columnas cada una
// false = disponible, true = reservado
let seatData = {
  A: [false, false, false, false, false, false],
  B: [false, false, false, false, false, false],
  C: [false, false, false, false, false, false],
  D: [false, false, false, false, false, false],
  E: [false, false, false, false, false, false]
};

// Ruta para obtener el estado de los asientos
app.get('/api/seats', (req, res) => {
  res.json(seatData);
});

// Ruta para reservar asientos
// Espera un body con un arreglo de objetos { row: 'A', seat: 3 }, por ejemplo
app.post('/api/reserve', (req, res) => {
  const seatsToReserve = req.body; // [{ row: 'A', seat: 1 }, { row: 'B', seat: 2 }, ...]

  seatsToReserve.forEach(({ row, seat }) => {
    // Marcamos el asiento como reservado (true) si está en rango
    if (seatData[row] && seatData[row][seat - 1] === false) {
      seatData[row][seat - 1] = true;
    }
  });

  // Devolvemos el estado actualizado de todos los asientos
  res.json(seatData);
});

// Iniciamos el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
