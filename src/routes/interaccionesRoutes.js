const express = require('express');
const router = express.Router();

// Importamos el guardia de seguridad
const { verificarToken } = require('../middlewares/authMiddleware');

// Importamos las funciones del controlador de interacciones
const { 
    obtenerResenasPorComercio, 
    crearResena, 
    obtenerResenaPorId, 
    editarResena, 
    eliminarResena,
    obtenerMetricasComercio, 
    obtenerMetricaPorId, 
    registrarInteraccion 
} = require('../controllers/interacciones.controller');

// ==========================================
// 💬 MÓDULO: RESEÑAS
// ==========================================

// CANASTA 1: RUTAS PÚBLICAS
// Todo el mundo puede leer las reseñas de un comercio
router.get('/resenas/comercio/:comercio_id', obtenerResenasPorComercio);
router.get('/resenas/:id', obtenerResenaPorId);

// CANASTA 2: RUTAS PRIVADAS
// Solo los usuarios registrados pueden dejar, editar o borrar su reseña
router.post('/resenas', verificarToken, crearResena);
router.put('/resenas/:id', verificarToken, editarResena);
router.delete('/resenas/:id', verificarToken, eliminarResena);


// ==========================================
// 📊 MÓDULO: MÉTRICAS E INTERACCIONES
// ==========================================

// CANASTA 1: RUTAS PÚBLICAS
// Generalmente, registrar un clic o una vista no requiere login (queremos medir a los visitantes también)
router.post('/registro', registrarInteraccion);

// CANASTA 2: RUTAS PRIVADAS
// Solo los dueños de comercios (o admins) pueden ver sus métricas
router.get('/metricas/comercio/:comercio_id', verificarToken, obtenerMetricasComercio);
router.get('/metricas/:id', verificarToken, obtenerMetricaPorId);


module.exports = router;