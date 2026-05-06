const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// Importamos la conexión a tu DB (ajusta la ruta si tu archivo se llama distinto)
const pool = require('../db/database')

const registrar = async (nombre, email, password) => {
    // 1. Verificamos si ya existe el correo
    const userExists = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (userExists.rowCount > 0) {
        const error = new Error('El correo ya está registrado en Parche Local');
        error.code = 'EMAIL_DUPLICADO';
        throw error; // Lanzamos el error para que el controlador lo atrape
    }

    // 2. Encriptamos la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Guardamos en Base de Datos
    const query = `
        INSERT INTO usuarios (nombre, email, password_hash, metodo_registro)
        VALUES ($1, $2, $3, 'email')
        RETURNING id, nombre, email, rol_id;
    `;
    const resultado = await pool.query(query, [nombre, email, passwordHash]);
    
    return resultado.rows[0];
};

const login = async (email, password) => {
    // 1. Buscamos al usuario (tiene que estar activo)
    const query = 'SELECT id, nombre, email, password_hash, rol_id FROM usuarios WHERE email = $1 AND activo = TRUE';
    const resultado = await pool.query(query, [email]);

    if (resultado.rowCount === 0) {
        const error = new Error('Credenciales inválidas');
        error.code = 'CREDENCIALES_INVALIDAS';
        throw error;
    }

    const usuario = resultado.rows[0];

    // 2. Comparamos el texto plano con el Hash de la DB
    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
        const error = new Error('Credenciales inválidas');
        error.code = 'CREDENCIALES_INVALIDAS';
        throw error;
    }

    // 3. Creamos el Token (Pasaporte)
    const payload = { id: usuario.id, rol_id: usuario.rol_id };
    
    // IMPORTANTE: Debes tener un archivo .env en la raíz de tu proyecto con JWT_SECRET=tu_clave_super_secreta_aqui
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    return {
        token,
        usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
            rol_id: usuario.rol_id
        }
    };
};

module.exports = { registrar, login };