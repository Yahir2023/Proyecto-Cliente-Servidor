const express = require('express');
const router = express.Router();
const db = require('../config/db'); 
const verifyToken = require('../middleware/authMiddleware'); 

router.get('/peliculas', verifyToken, (req, res) => {
    const query = 'SELECT id_pelicula, titulo, duracion, clasificacion, sinopsis, director, genero FROM peliculas';
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error al obtener las películas' });
        }
        res.json(results);
    });
});

module.exports = router;
