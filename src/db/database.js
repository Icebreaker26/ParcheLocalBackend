const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

// Probar la conexión al iniciar
pool.connect()
    .then(() => console.log('✅ Conexión a PostgreSQL (Pool) establecida.'))
    .catch(err => console.error('❌ Error conectando a PostgreSQL:', err.stack));

module.exports = pool;