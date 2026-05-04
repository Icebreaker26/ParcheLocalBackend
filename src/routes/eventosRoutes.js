const express = require('express');
const router = express.Router();

// Importamos el guardia de seguridad
const { verificarToken } = require('../middlewares/authMiddleware');

// Importamos las funciones desde el controlador correspondiente
const { 
    obtenerEventos,
    obtenerEventoPorId,
    crearEvento,
    editarEvento,
    eliminarEvento,
    obtenerPromocionesFlash,
    obtenerPromocionFlashPorId,
    crearPromocionFlash,
    editarPromocionFlash,
    eliminarPromocionFlash
} = require('../controllers/eventos.controller');

// ==========================================
// 🎟️ MÓDULO: EVENTOS REGULARES
// ==========================================

// CANASTA 1: RUTAS PÚBLICAS (Visitantes)
router.get('/', obtenerEventos); 
router.get('/:id', obtenerEventoPorId); 

// CANASTA 2: RUTAS PRIVADAS (Comercios/Admins con Token)
router.post('/', verificarToken, crearEvento); 
router.put('/:id', verificarToken, editarEvento); 
router.delete('/:id', verificarToken, eliminarEvento); 


// ==========================================
// ⚡ MÓDULO: PROMOCIONES FLASH
// ==========================================
// Nota Senior: Usamos un sub-path para no colisionar con las rutas de arriba

// CANASTA 1: RUTAS PÚBLICAS
router.get('/promociones/flash', obtenerPromocionesFlash);
router.get('/promociones/flash/:id', obtenerPromocionFlashPorId);

// CANASTA 2: RUTAS PRIVADAS
router.post('/promociones/flash', verificarToken, crearPromocionFlash);
router.put('/promociones/flash/:id', verificarToken, editarPromocionFlash);
router.delete('/promociones/flash/:id', verificarToken, eliminarPromocionFlash);

module.exports = router;