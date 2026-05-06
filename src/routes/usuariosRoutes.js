const express = require('express');
const router = express.Router();

// Importamos el guardia de seguridad
const { verificarToken } = require('../middlewares/authMiddleware');

// Importamos TODAS las funciones del controlador de usuarios
const { 
    crearUsuario, 
    obtenerUsuarios, 
    editarUsuario, 
    eliminarUsuario, 
    obtenerUsuarioPorId,
    crearRol, 
    obtenerRoles, 
    editarRol, 
    eliminarRol, 
    obtenerRolPorId,
    agregarFavorito, 
    obtenerFavoritoPorId, 
    obtenerFavoritosPorUsuario, 
    eliminarFavorito
} = require('../controllers/usuarios.controller');

// ==========================================
// 👤 MÓDULO: USUARIOS (Perfiles)
// ==========================================
// Nota Senior: El registro público ya se maneja en authRoutes. 
// Aquí 'crearUsuario' sería para uso interno (ej. un Admin creando a otro Admin).

// Todas son privadas para proteger la data personal
router.get('/', verificarToken, obtenerUsuarios); 
router.get('/:id', verificarToken, obtenerUsuarioPorId); 
router.post('/', verificarToken, crearUsuario); 
router.put('/:id', verificarToken, editarUsuario); 
router.delete('/:id', verificarToken, eliminarUsuario); 

// ==========================================
// ⭐ MÓDULO: FAVORITOS
// ==========================================
// Todo privado. Nadie debería ver qué comercios le gustan a otra persona.

router.get('/favoritos/usuario/:usuario_id', verificarToken, obtenerFavoritosPorUsuario);
router.post('/favoritos', verificarToken, agregarFavorito);
router.get('/favoritos/:id', verificarToken, obtenerFavoritoPorId);
router.delete('/favoritos/:usuario_id/:comercio_id', verificarToken, eliminarFavorito);
// ==========================================
// 🛡️ MÓDULO: ROLES Y PERMISOS
// ==========================================
// Todo privado. Exclusivo para la administración interna de Parche Local.

router.get('/roles/lista', verificarToken, obtenerRoles);
router.get('/roles/:id', verificarToken, obtenerRolPorId);
router.post('/roles', verificarToken, crearRol);
router.put('/roles/:id', verificarToken, editarRol);
router.delete('/roles/:id', verificarToken, eliminarRol);

module.exports = router;