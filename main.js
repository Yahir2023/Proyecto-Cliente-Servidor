// main.js

// Estructuras para manejar la selección
let seatData = {};       // Objeto que recibimos del servidor con la info de asientos
let selectedSeats = [];  // Arreglo de asientos que el usuario selecciona (sin confirmar)

// Al cargar la página, pedimos los asientos al servidor
window.addEventListener('DOMContentLoaded', async () => {
  await loadSeatsFromServer();
});

// Obtiene el estado de los asientos del servidor
async function loadSeatsFromServer() {
  try {
    const response = await fetch('/api/seats');
    seatData = await response.json(); // Ej: { A: [false, false, ...], B: [...], ... }
    renderSeats();
  } catch (error) {
    console.error('Error al cargar asientos:', error);
  }
}

// Dibuja los asientos en pantalla
function renderSeats() {
  const seatMap = document.getElementById('seat-map');
  seatMap.innerHTML = ''; // Limpia cualquier contenido previo

  // Recorremos cada fila en seatData
  for (const row in seatData) {
    // Creamos un contenedor para la fila
    const rowDiv = document.createElement('div');
    rowDiv.classList.add('mb-2'); // Margen entre filas

    // Etiqueta de la fila (A, B, C...)
    const rowLabel = document.createElement('strong');
    rowLabel.textContent = row + ' ';
    rowDiv.appendChild(rowLabel);

    // Asientos de la fila
    seatData[row].forEach((isReserved, index) => {
      const seatNumber = index + 1;
      const seatDiv = document.createElement('div');
      seatDiv.classList.add('seat');
      seatDiv.textContent = seatNumber;

      // Si está reservado, aplicamos la clase 'reserved'
      if (isReserved) {
        seatDiv.classList.add('reserved');
      } else {
        // Si está disponible, le agregamos evento para seleccionar
        seatDiv.addEventListener('click', () => {
          toggleSeatSelection(row, seatNumber, seatDiv);
        });
      }

      rowDiv.appendChild(seatDiv);
    });

    seatMap.appendChild(rowDiv);
  }

  // Actualizamos la lista de asientos seleccionados (por si renderizamos de nuevo)
  updateSelectedSeatsList();
}

// Marca o desmarca un asiento al hacer click
function toggleSeatSelection(row, seatNumber, seatDiv) {
  const seatId = `${row}${seatNumber}`;
  const index = selectedSeats.indexOf(seatId);

  if (index === -1) {
    // No estaba seleccionado, lo seleccionamos
    selectedSeats.push(seatId);
    seatDiv.classList.add('selected');
  } else {
    // Ya estaba seleccionado, lo quitamos
    selectedSeats.splice(index, 1);
    seatDiv.classList.remove('selected');
  }

  updateSelectedSeatsList();
}

// Muestra la lista de asientos seleccionados en el <ul> #selected-seats
function updateSelectedSeatsList() {
  const ul = document.getElementById('selected-seats');
  ul.innerHTML = '';

  selectedSeats.forEach(seatId => {
    const li = document.createElement('li');
    li.textContent = seatId;
    ul.appendChild(li);
  });
}

// Escuchamos el botón "Confirmar compra"
const btnReserve = document.getElementById('btnReserve');
btnReserve.addEventListener('click', async () => {
  if (selectedSeats.length === 0) {
    alert('No has seleccionado ningún asiento.');
    return;
  }

  // Transformamos ["A1", "A2", ...] en [{ row: 'A', seat: 1 }, ...]
  const seatsToReserve = selectedSeats.map(seatId => {
    const row = seatId.charAt(0);               // 'A'
    const seat = seatId.substring(1);           // '1'
    return { row, seat: Number(seat) };
  });

  try {
    const response = await fetch('/api/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(seatsToReserve)
    });
    const updatedData = await response.json();
    seatData = updatedData;
    // Limpiamos selección
    selectedSeats = [];
    // Volvemos a renderizar
    renderSeats();
    alert('Asientos reservados correctamente.');
  } catch (error) {
    console.error('Error al reservar asientos:', error);
    alert('Ocurrió un error al reservar. Intenta de nuevo.');
  }
});
