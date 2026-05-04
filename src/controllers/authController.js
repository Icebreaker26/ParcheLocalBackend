// Importamos el Servicio (la cocina)
const authService = require('../services/authService');

const registrarUsuario = async (req, res) => {
    const { nombre, email, password } = req.body;

    // Validación rápida "de pasillo"
    if (!email || !password) {
        return res.status(400).json({ status: 'error', message: 'Email y password son obligatorios' });
    }

    try {
        // Mandamos el trabajo pesado al servicio
        const nuevoUsuario = await authService.registrar(nombre, email, password);

        return res.status(201).json({
            status: 'success',
            message: 'Usuario registrado exitosamente',
            data: nuevoUsuario
        });
    } catch (error) {
        // Si la cocina reporta un problema específico (como correo duplicado)
        if (error.code === 'EMAIL_DUPLICADO') {
            return res.status(400).json({ status: 'error', message: error.message });
        }
        console.error(`[Registro Error]: ${error.message}`);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
};

const loginUsuario = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ status: 'error', message: 'Faltan credenciales' });
    }

    try {
        const dataAuth = await authService.login(email, password);

        return res.status(200).json({
            status: 'success',
            message: 'Inicio de sesión exitoso',
            data: dataAuth
        });
    } catch (error) {
        if (error.code === 'CREDENCIALES_INVALIDAS') {
            return res.status(401).json({ status: 'error', message: error.message });
        }
        console.error(`[Login Error]: ${error.message}`);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
};

module.exports = { registrarUsuario, loginUsuario };