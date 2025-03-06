// asientos.js

const router = express.Router();
const asientosController = require('../controllers/asientosController');

// Obtener todos los asientos
router.get('/asientos', asientosController.getAllAsientos);

// Agregar un nuevo asiento
router.post('/asientos', asientosController.addAsiento);

// Eliminar un asiento
router.delete('/asientos/:id', asientosController.deleteAsiento);

module.exports = router;
