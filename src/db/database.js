const { Pool } = require('pg');
require('dotenv').config();

// Detectamos si estamos en Railway (o cualquier entorno de producción)
const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL;

const poolConfig = {
    // Si existe DATABASE_URL (Railway), la usa directamente. 
    // Si no, usa las variables locales una por una.
    connectionString: process.env.DATABASE_URL,
    
    // Si no hay connectionString, usamos la configuración manual (Local)
    ...(process.env.DATABASE_URL ? {} : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    }),

    // --- OPTIMIZACIÓN PARA CONEXIONES ---
    max: 20, 
    idleTimeoutMillis: 30000, 
    connectionTimeoutMillis: 2000, 

    // SSL: Obligatorio en la nube (Railway), desactivado en local
    ssl: isProduction ? { rejectUnauthorized: false } : false
};

const pool = new Pool(poolConfig);

// Probar la conexión al iniciar (Adaptado de tu código y el Senior)
pool.connect()
    .then(() => console.log(`✅ Conexión a PostgreSQL establecida en modo: ${isProduction ? '☁️ PRODUCCIÓN/NUBE' : '💻 LOCAL'}`))
    .catch(err => console.error('❌ Error conectando a PostgreSQL:', err.stack));

// Capturar errores inesperados mientras la app está corriendo
pool.on('error', (err) => {
    console.error('❌ Error inesperado en el pool de PostgreSQL', err);
});

module.exports = pool;