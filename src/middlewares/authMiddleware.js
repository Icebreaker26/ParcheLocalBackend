const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    // Verificamos si trae el token en el formato correcto (Bearer <token>)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            status: 'error', 
            message: 'Acceso denegado. Token no proporcionado.' 
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Validamos la autenticidad del token con nuestra firma secreta
        const decodificado = jwt.verify(token, process.env.JWT_SECRET);
        
        // Inyectamos los datos en la petición para el siguiente controlador
        req.usuario = decodificado; 
        next(); // Todo en orden, le abrimos la puerta
        
    } catch (error) {
        return res.status(403).json({ 
            status: 'error', 
            message: 'Token inválido o expirado. Inicia sesión de nuevo.' 
        });
    }
};

module.exports = { verificarToken };