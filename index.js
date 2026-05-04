const express = require('express');
const cors = require('cors');
require('dotenv').config();
const rateLimit = require('express-rate-limit');

// 1. Conexión a la Base de Datos
require('./src/db/database');

// ==========================================
// 2. IMPORTACIÓN DE RUTAS
// ==========================================
const authRoutes = require('./src/routes/authRoutes');
const comerciosRoutes = require('./src/routes/comerciosRoutes');
const eventosRoutes = require('./src/routes/eventosRoutes');
const usuariosRoutes = require('./src/routes/usuariosRoutes');
const maestrosRoutes = require('./src/routes/maestrosRoutes');
const interaccionesRoutes = require('./src/routes/interaccionesRoutes');

// Inicializar la app
const app = express();

// ==========================================
// 3. MIDDLEWARES GLOBALES
// ==========================================
app.use(cors()); // Permite peticiones desde React/Frontend
app.use(express.json()); // Permite recibir JSON en el body (vital para auth y posts)


// Creamos el limitador global
const limiterGlobal = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos en milisegundos
    max: 100, // Límite de 100 peticiones por IP
    message: { 
        status: 'error', 
        message: 'Has realizado demasiadas peticiones. Por favor, intenta de nuevo en 15 minutos.' 
    },
    standardHeaders: true, // Devuelve info del límite en los headers `RateLimit-*`
    legacyHeaders: false, // Deshabilita los headers obsoletos `X-RateLimit-*`
});

// 3. Aplicamos el limitador a TODA la API
app.use('/api/', limiterGlobal);


// ==========================================
// 4. EL "CONMUTADOR" (Prefijos de Ruta)
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/comercios', comerciosRoutes);
app.use('/api/eventos', eventosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/maestros', maestrosRoutes);
app.use('/api/interacciones', interaccionesRoutes);

// ==========================================
// 5. RUTA DE PRUEBA (Health Check)
// ==========================================
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        message: 'El ecosistema hiperlocal está en línea 🚀' 
    });
});

// ==========================================
// 6. INICIO DEL SERVIDOR
// ==========================================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor de Parche Local corriendo en el puerto ${PORT}`);
});