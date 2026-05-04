const express = require('express');
const router = express.Router();
// Importamos rate-limit aquí también
const rateLimit = require('express-rate-limit');

const { registrarUsuario, loginUsuario } = require('../controllers/authController');

// Creamos un limitador súper estricto
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Máximo 5 intentos fallidos/exitosos por IP
    message: { 
        status: 'error', 
        message: 'Demasiados intentos de inicio de sesión. Por seguridad, tu cuenta ha sido bloqueada temporalmente. Intenta en 15 minutos.' 
    }
});

// Rutas públicas
router.post('/registro', registrarUsuario);

// ¡Aplicamos el limitador estricto SOLAMENTE a la ruta de login!
router.post('/login', loginLimiter, loginUsuario);

module.exports = router;