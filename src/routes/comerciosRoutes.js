const express = require('express');
const router = express.Router();

// Importamos el guardia de seguridad
const { verificarToken } = require('../middlewares/authMiddleware');

// Importamos SÓLO las funciones del controlador de comercios
const { 
    obtenerComercios,
    obtenerComercioPorId,
    crearComercio,
    editarComercio,
    eliminarComercio
} = require('../controllers/comercios.controller');

// ==========================================
// CANASTA 1: RUTAS PÚBLICAS (Sin Middleware)
// ==========================================
// Los visitantes pueden ver la lista de comercios y el detalle de uno específico.
router.get('/', obtenerComercios); 
router.get('/:id', obtenerComercioPorId); 

// ==========================================
// CANASTA 2: RUTAS PRIVADAS (Con Middleware)
// ==========================================
// Solo los usuarios autenticados (con Token) pueden crear, editar o eliminar.
router.post('/', verificarToken, crearComercio); 
router.put('/:id', verificarToken, editarComercio); 
router.delete('/:id', verificarToken, eliminarComercio); 

module.exports = router;