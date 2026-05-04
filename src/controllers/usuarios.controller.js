const pool = require('../db/database');
///////////////////////////////// ZONA DE ROLES

const crearRol = async (req, res) => {
    const { nombre, descripcion } = req.body;

    // 1. Validación de campos críticos (Fail-Fast)
    if (!nombre || nombre.trim().length === 0) {
        return res.status(400).json({
            status: 'error',
            message: 'El nombre del rol es obligatorio'
        });
    }

    try {
        // 2. Normalización de datos
        // Convertimos el nombre a minúsculas o mayúsculas para evitar 
        // tener "Admin" y "admin" como roles distintos si la lógica lo requiere.
        const nombreNormalizado = nombre.trim().toLowerCase();
        const descNormalizada = descripcion?.trim() || null;

        const query = `
            INSERT INTO roles (nombre, descripcion) 
            VALUES ($1, $2) 
            RETURNING id, nombre;
        `;
        
        const values = [nombreNormalizado, descNormalizada];

        const resultado = await pool.query(query, values);

        // 3. Éxito
        return res.status(201).json({
            status: 'success',
            message: 'Rol creado correctamente',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Roles Error]: ${error.message}`);

        // 4. Manejo de duplicados (Unique constraint: nombre)
        if (error.code === '23505') {
            return res.status(409).json({
                status: 'error',
                message: `El rol '${nombre}' ya existe en el sistema`
            });
        }

        // Error genérico
        return res.status(500).json({
            status: 'error',
            message: 'Error interno al procesar el registro del rol'
        });
    }
};

const obtenerRoles = async (req, res) => {
    try {
        // 1. Parámetros opcionales (Senior: siempre piensa en el crecimiento)
        // Permite limitar resultados o saltar registros desde la URL (?limit=10&offset=0)
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        const query = `
            SELECT id, nombre, descripcion 
            FROM roles 
            ORDER BY nombre ASC 
            LIMIT $1 OFFSET $2;
        `;

        const resultado = await pool.query(query, [limit, offset]);

        // 2. Validación de contenido
        // Si no hay roles, devolvemos un 200 con array vacío, pero indicamos que está todo OK
        if (resultado.rows.length === 0) {
            return res.status(200).json({
                status: 'success',
                message: 'No se encontraron roles registrados',
                data: []
            });
        }

        // 3. Respuesta exitosa
        return res.status(200).json({
            status: 'success',
            results: resultado.rows.length,
            data: resultado.rows
        });

    } catch (error) {
        console.error(`[Roles Fetch Error]: ${error.message}`);
        
        return res.status(500).json({
            status: 'error',
            message: 'Error al obtener la lista de roles'
        });
    }
};

const editarRol = async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;

    // 1. Validación mínima
    if (!nombre?.trim()) {
        return res.status(400).json({
            status: 'error',
            message: 'El nombre del rol no puede estar vacío'
        });
    }

    try {
        const nombreNormalizado = nombre.trim().toLowerCase();
        
        const query = `
            UPDATE roles 
            SET nombre = $1, descripcion = $2 
            WHERE id = $3 
            RETURNING id, nombre, descripcion;
        `;

        const resultado = await pool.query(query, [nombreNormalizado, descripcion?.trim(), id]);

        // 2. Verificar si el rol existía
        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'El rol que intentas editar no existe'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Rol actualizado correctamente',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Roles Update Error]: ${error.message}`);
        
        if (error.code === '23505') {
            return res.status(409).json({
                status: 'error',
                message: 'Ya existe otro rol con ese nombre'
            });
        }

        return res.status(500).json({ status: 'error', message: 'Fallo al actualizar el rol' });
    }
};


const eliminarRol = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Protección de roles críticos (Senior: no permitas borrar el Admin o Usuario base)
        // Asumiendo que ID 1 es Admin y 3 es Usuario
        if (['1', '3'].includes(id)) {
            return res.status(403).json({
                status: 'error',
                message: 'No se pueden eliminar los roles del sistema protegidos'
            });
        }

        const query = `DELETE FROM roles WHERE id = $1 RETURNING id;`;
        const resultado = await pool.query(query, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Rol no encontrado'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Rol eliminado exitosamente'
        });

    } catch (error) {
        console.error(`[Roles Delete Error]: ${error.message}`);

        // Error 23503: Violación de llave foránea (Hay usuarios con este rol)
        if (error.code === '23503') {
            return res.status(400).json({
                status: 'error',
                message: 'No se puede eliminar el rol porque tiene usuarios asociados'
            });
        }

        return res.status(500).json({ status: 'error', message: 'Error interno al eliminar el rol' });
    }
};

const obtenerRolPorId = async (req, res) => {
    const { id } = req.params;

    // 1. Validación de entrada (Senior Tip: Validar que el ID sea un número)
    if (isNaN(id)) {
        return res.status(400).json({
            status: 'error',
            message: 'El ID proporcionado no es válido'
        });
    }

    try {
        const query = `
            SELECT id, nombre, descripcion 
            FROM roles 
            WHERE id = $1;
        `;

        const resultado = await pool.query(query, [id]);

        // 2. Manejo de existencia
        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'El rol solicitado no existe'
            });
        }

        // 3. Respuesta exitosa
        return res.status(200).json({
            status: 'success',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Roles Fetch Error]: ${error.message}`);
        return res.status(500).json({
            status: 'error',
            message: 'Error al consultar el rol en la base de datos'
        });
    }
};


///////////////////////////////// ZONA DE USUARIOS

const bcrypt = require('bcrypt'); // Librería estándar para seguridad

const crearUsuario = async (req, res) => {
    const { rol_id = 3, nombre, email, password, metodo_registro = 'email' } = req.body;

    // 1. Validación de campos críticos
    if (!email?.trim() || !password) {
        return res.status(400).json({
            status: 'error',
            message: 'Email y contraseña son obligatorios'
        });
    }

    try {
        // 2. Seguridad y Limpieza
        const emailLimpio = email.trim().toLowerCase();
        
        // Encriptar la contraseña (Nunca guardarla en texto plano)
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const query = `
            INSERT INTO usuarios (rol_id, nombre, email, password_hash, metodo_registro) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING id, rol_id, nombre, email, creado_en;
        `;

        const values = [rol_id, nombre?.trim(), emailLimpio, passwordHash, metodo_registro];

        const resultado = await pool.query(query, values);

        // 3. Éxito (No devolvemos el hash del password por seguridad)
        return res.status(201).json({
            status: 'success',
            message: 'Usuario registrado exitosamente',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Users Create Error]: ${error.message}`);

        // Manejo de email duplicado (Clave única)
        if (error.code === '23505') {
            return res.status(409).json({
                status: 'error',
                message: 'El correo electrónico ya está registrado'
            });
        }

        // Error de rol inexistente (FK violation)
        if (error.code === '23503') {
            return res.status(400).json({
                status: 'error',
                message: 'El rol asignado no es válido'
            });
        }

        return res.status(500).json({
            status: 'error',
            message: 'Error interno en el servidor durante el registro'
        });
    }
};


const obtenerUsuarios = async (req, res) => {
    try {
        const { rol } = req.query;
        
        // Seleccionamos datos específicos (JAMÁS traer el password_hash)
        let query = `
            SELECT u.id, u.nombre, u.email, u.metodo_registro, u.creado_en, r.nombre as rol_nombre
            FROM usuarios u
            INNER JOIN roles r ON u.rol_id = r.id
        `;
        const params = [];

        // Filtro por rol si es necesario
        if (rol) {
            params.push(rol);
            query += ` WHERE r.nombre = $1`;
        }

        query += ` ORDER BY u.creado_en DESC`;

        const resultado = await pool.query(query, params);

        return res.status(200).json({
            status: 'success',
            results: resultado.rows.length,
            data: resultado.rows
        });

    } catch (error) {
        console.error(`[Users Fetch Error]: ${error.message}`);
        return res.status(500).json({
            status: 'error',
            message: 'Error al obtener la lista de usuarios'
        });
    }
};

const editarUsuario = async (req, res) => {
    const { id } = req.params;
    const { nombre, rol_id, activo } = req.body;

    try {
        const query = `
            UPDATE usuarios 
            SET 
                nombre = COALESCE($1, nombre), 
                rol_id = COALESCE($2, rol_id),
                activo = COALESCE($3, activo)
            WHERE id = $4 AND activo = TRUE
            RETURNING id, nombre, email, rol_id, activo;
        `;

        const values = [nombre?.trim(), rol_id, activo, id];
        const resultado = await pool.query(query, values);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Usuario no encontrado o inactivo'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Perfil actualizado correctamente',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Usuarios Update Error]: ${error.message}`);
        
        // Error de llave foránea (Si el rol_id enviado no existe)
        if (error.code === '23503') {
            return res.status(400).json({ status: 'error', message: 'El rol asignado no es válido' });
        }

        return res.status(500).json({ status: 'error', message: 'Error al actualizar el usuario' });
    }
};


const eliminarUsuario = async (req, res) => {
    const { id } = req.params;

    try {
        // Senior Tip: Antes de "borrar", podrías verificar si es el único Admin de un comercio
        // para evitar dejar comercios sin administrador.
        
        const query = `
            UPDATE usuarios 
            SET activo = FALSE 
            WHERE id = $1 AND activo = TRUE
            RETURNING nombre, email;
        `;

        const resultado = await pool.query(query, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'El usuario no existe o ya ha sido dado de baja'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: `El usuario "${resultado.rows[0].nombre}" (${resultado.rows[0].email}) ha sido desactivado.`
        });

    } catch (error) {
        console.error(`[Usuarios Delete Error]: ${error.message}`);
        return res.status(500).json({ status: 'error', message: 'Fallo al procesar la baja del usuario' });
    }
};

const obtenerUsuarioPorId = async (req, res) => {
    const { id } = req.params;

    // 1. Validación de tipo de dato (Fail-Fast)
    if (isNaN(id)) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'El ID de usuario no es válido' 
        });
    }

    try {
        // 2. Query con JOIN para traer el nombre del rol y EXCLUSIÓN de password_hash
        const query = `
            SELECT 
                u.id, 
                u.nombre, 
                u.email, 
                u.metodo_registro, 
                u.creado_en, 
                u.activo,
                r.nombre as rol_nombre
            FROM usuarios u
            INNER JOIN roles r ON u.rol_id = r.id
            WHERE u.id = $1 AND u.activo = TRUE;
        `;

        const resultado = await pool.query(query, [id]);

        // 3. Verificación de existencia
        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Usuario no encontrado o cuenta desactivada'
            });
        }

        // 4. Respuesta exitosa (Data limpia)
        return res.status(200).json({
            status: 'success',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Usuarios Fetch ID Error]: ${error.message}`);
        return res.status(500).json({ 
            status: 'error', 
            message: 'Error interno al consultar el perfil del usuario' 
        });
    }
};


////////////////////////////// ZONA DE COMERCIOS FAVORITOS

const agregarFavorito = async (req, res) => {
    const { usuario_id, comercio_id } = req.body;

    // 1. Validación básica
    if (!usuario_id || !comercio_id) {
        return res.status(400).json({
            status: 'error',
            message: 'Se requiere el ID del usuario y del comercio'
        });
    }

    try {
        const query = `
            INSERT INTO comercios_favoritos (usuario_id, comercio_id) 
            VALUES ($1, $2) 
            RETURNING id, agregado_en;
        `;

        const resultado = await pool.query(query, [usuario_id, comercio_id]);

        return res.status(201).json({
            status: 'success',
            message: 'Comercio añadido a favoritos',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Favoritos Create Error]: ${error.message}`);

        // Error 23505: Ya existe en favoritos (Unique violation)
        if (error.code === '23505') {
            return res.status(409).json({
                status: 'error',
                message: 'Este comercio ya está en tu lista de favoritos'
            });
        }

        // Error 23503: Usuario o Comercio no existen (FK violation)
        if (error.code === '23503') {
            return res.status(404).json({
                status: 'error',
                message: 'Usuario o comercio no encontrado'
            });
        }

        return res.status(500).json({
            status: 'error',
            message: 'No se pudo procesar la solicitud'
        });
    }
};


const obtenerFavoritosPorUsuario = async (req, res) => {
    const { usuario_id } = req.params; // Generalmente viene por URL: /favoritos/:usuario_id

    if (!usuario_id) {
        return res.status(400).json({ status: 'error', message: 'ID de usuario necesario' });
    }

    try {
        // Traemos la info del comercio de una vez para ahorrar peticiones al frontend
        const query = `
            SELECT 
                f.id as favorito_id, f.agregado_en,
                c.id as comercio_id, c.nombre, c.logo_url, c.direccion, c.telefono_whatsapp,
                cat.nombre as categoria_nombre
            FROM comercios_favoritos f
            JOIN comercios c ON f.comercio_id = c.id
            JOIN categorias cat ON c.categoria_id = cat.id
            WHERE f.usuario_id = $1
            ORDER BY f.agregado_en DESC;
        `;

        const resultado = await pool.query(query, [usuario_id]);

        return res.status(200).json({
            status: 'success',
            results: resultado.rows.length,
            data: resultado.rows
        });

    } catch (error) {
        console.error(`[Favoritos Fetch Error]: ${error.message}`);
        return res.status(500).json({
            status: 'error',
            message: 'Error al obtener la lista de favoritos'
        });
    }
};

const eliminarFavorito = async (req, res) => {
    // Usamos query params o body. En este caso, params es más común para DELETE
    const { usuario_id, comercio_id } = req.params;

    if (!usuario_id || !comercio_id) {
        return res.status(400).json({
            status: 'error',
            message: 'Se requieren ambos IDs para eliminar de favoritos'
        });
    }

    try {
        const query = `
            DELETE FROM comercios_favoritos 
            WHERE usuario_id = $1 AND comercio_id = $2
            RETURNING id;
        `;

        const resultado = await pool.query(query, [usuario_id, comercio_id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'La relación de favorito no existe'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Comercio eliminado de tus favoritos'
        });

    } catch (error) {
        console.error(`[Favoritos Delete Error]: ${error.message}`);
        return res.status(500).json({
            status: 'error',
            message: 'Error al procesar la solicitud'
        });
    }
};

const obtenerFavoritoPorId = async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'El ID de favorito no es válido' 
        });
    }

    try {
        // Unimos con comercios para que la respuesta sea útil al usuario
        const query = `
            SELECT 
                f.id, 
                f.agregado_en,
                u.id as usuario_id,
                u.nombre as usuario_nombre,
                c.id as comercio_id,
                c.nombre as comercio_nombre,
                c.logo_url as comercio_logo,
                c.direccion as comercio_direccion
            FROM comercios_favoritos f
            INNER JOIN usuarios u ON f.usuario_id = u.id
            INNER JOIN comercios c ON f.comercio_id = c.id
            WHERE f.id = $1 AND u.activo = TRUE AND c.activo = TRUE;
        `;

        const resultado = await pool.query(query, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'La relación de favorito no existe o el comercio ya no está disponible'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Favoritos Fetch ID Error]: ${error.message}`);
        return res.status(500).json({ 
            status: 'error', 
            message: 'Error al consultar el registro de favorito' 
        });
    }
};

module.exports = {
    crearRol,
    obtenerRoles,
    editarRol,
    eliminarRol,
    obtenerRolPorId,
    
    crearUsuario,
    obtenerUsuarios,
    editarUsuario,
    eliminarUsuario,
    obtenerUsuarioPorId,

    agregarFavorito,
    obtenerFavoritoPorId,
    obtenerFavoritosPorUsuario,
    eliminarFavorito

};