const express = require('express');
const router = express.Router();

// Importamos el guardia de seguridad
const { verificarToken } = require('../middlewares/authMiddleware');

// Importamos las funciones desde el controlador de maestros
const { 
    crearMunicipio, 
    obtenerMunicipios, 
    editarMunicipio, 
    eliminarMunicipio, 
    obtenerMunicipioPorId,
    crearCategoria, 
    obtenerCategorias, 
    editarCategoria, 
    eliminarCategoria, 
    obtenerCategoriaPorId
} = require('../controllers/maestros.controller');

// ==========================================
// 🗺️ MÓDULO: MUNICIPIOS
// ==========================================

// CANASTA 1: RUTAS PÚBLICAS (Para llenar los select/dropdowns del frontend)
router.get('/municipios', obtenerMunicipios);
router.get('/municipios/:id', obtenerMunicipioPorId);

// CANASTA 2: RUTAS PRIVADAS (Solo administradores de Parche Local)
router.post('/municipios', verificarToken, crearMunicipio);
router.put('/municipios/:id', verificarToken, editarMunicipio);
router.delete('/municipios/:id', verificarToken, eliminarMunicipio);


// ==========================================
// 🏷️ MÓDULO: CATEGORÍAS
// ==========================================

// CANASTA 1: RUTAS PÚBLICAS
router.get('/categorias', obtenerCategorias);
router.get('/categorias/:id', obtenerCategoriaPorId);

// CANASTA 2: RUTAS PRIVADAS
router.post('/categorias', verificarToken, crearCategoria);
router.put('/categorias/:id', verificarToken, editarCategoria);
router.delete('/categorias/:id', verificarToken, eliminarCategoria);


module.exports = router;