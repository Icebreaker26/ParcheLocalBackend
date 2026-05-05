const pool = require('../db/database');


///////////////////////////////// ZONA DE COMERCIOS

const crearComercio = async (req, res) => {
    // 1. Desestructuración con valores por defecto (Evita nulos inesperados)
    const { 
        municipio_id, categoria_id, nombre, direccion, 
        telefono_whatsapp, descripcion, logo_url, size_visual = 1 
    } = req.body;

    // 2. Validación temprana (Fail Fast)
    // Un Senior no deja que el flujo siga si faltan datos críticos
    if (!municipio_id || !categoria_id || !nombre || !telefono_whatsapp) {
        return res.status(400).json({
            status: 'error',
            message: 'Faltan campos obligatorios para el registro'
        });
    }

    try {
        // 3. Query optimizada
        // Usamos trim() en strings para evitar espacios basura en la DB
        const query = `
            INSERT INTO comercios 
            (municipio_id, categoria_id, nombre, direccion, telefono_whatsapp, descripcion, logo_url, size_visual) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING id, nombre, created_at; 
        `; // Retornamos solo lo necesario, no siempre el "*" es óptimo

        const values = [
            municipio_id, 
            categoria_id, 
            nombre.trim(), 
            direccion?.trim(), 
            telefono_whatsapp.trim(), 
            descripcion?.trim(), 
            logo_url, 
            size_visual
        ];

        const resultado = await pool.query(query, values);

        // 4. Respuesta semántica
        return res.status(201).json({
            status: 'success',
            message: 'Comercio creado exitosamente',
            data: resultado.rows[0]
        });

    } catch (error) {
        // 5. Manejo de errores específico (Diferenciamos el error)
        console.error(`[DB Error]: ${error.message}`);

        // Error 23505 es "Unique Violation" en PostgreSQL (ej: nombre o whatsapp duplicado)
        if (error.code === '23505') {
            return res.status(409).json({ 
                status: 'error', 
                message: 'El comercio o el teléfono ya se encuentran registrados' 
            });
        }

        // Error de llave foránea (municipio o categoría no existen)
        if (error.code === '23503') {
            return res.status(400).json({ 
                status: 'error', 
                message: 'El municipio o categoría seleccionados no son válidos' 
            });
        }

        res.status(500).json({ 
            status: 'error', 
            message: 'Ocurrió un fallo inesperado en el servidor' 
        });
    }
};

// Obtener la lista de comercios (El directorio)
const obtenerComercios = async (req, res) => {
    try {
        // 1. Extraemos filtros (municipio_id y opcionalmente categoria_id)
        const { municipio_id, categoria_id } = req.query;

        // 2. Base de la consulta con el filtro de Borrado Lógico obligatorio
        let query = `
            SELECT 
                c.id, c.nombre, c.direccion, c.logo_url, 
                c.es_premium, c.size_visual, cat.nombre as categoria 
            FROM comercios c
            JOIN categorias cat ON c.categoria_id = cat.id
            WHERE c.activo = TRUE
        `;
        
        const values = [];

        // 3. Construcción dinámica de filtros adicionales
        if (municipio_id) {
            values.push(municipio_id);
            query += ` AND c.municipio_id = $${values.length}`;
        }

        if (categoria_id) {
            values.push(categoria_id);
            query += ` AND c.categoria_id = $${values.length}`;
        }

        // 4. Ordenamiento B2B (Premium primero, luego por nombre)
        query += ` ORDER BY c.es_premium DESC, c.nombre ASC`;

        const resultado = await pool.query(query, values);

        // 5. Respuesta consistente
        return res.status(200).json({
            status: 'success',
            total: resultado.rowCount,
            data: resultado.rows
        });

    } catch (error) {
        // Un Senior loguea el error interno pero no expone detalles sensibles al cliente
        console.error(`[Comercios Fetch Error]: ${error.message}`);
        return res.status(500).json({ 
            status: 'error', 
            message: 'No se pudo obtener la lista de comercios' 
        });
    }
};

const editarComercio = async (req, res) => {
    const { id } = req.params;
    const { 
        municipio_id, categoria_id, nombre, direccion, 
        telefono_whatsapp, descripcion, logo_url, es_premium, size_visual 
    } = req.body;

    // 1. Validación de campos obligatorios si se envían
    if (nombre && nombre.trim().length === 0) {
        return res.status(400).json({ status: 'error', message: 'El nombre no puede estar vacío' });
    }

    try {
        // 2. Query dinámica o actualización total (usamos COALESCE para mantener valores actuales si no se envían)
        const query = `
            UPDATE comercios 
            SET 
                municipio_id = COALESCE($1, municipio_id),
                categoria_id = COALESCE($2, categoria_id),
                nombre = COALESCE($3, nombre),
                direccion = COALESCE($4, direccion),
                telefono_whatsapp = COALESCE($5, telefono_whatsapp),
                descripcion = COALESCE($6, descripcion),
                logo_url = COALESCE($7, logo_url),
                es_premium = COALESCE($8, es_premium),
                size_visual = COALESCE($9, size_visual)
            WHERE id = $10
            RETURNING *;
        `;

        const values = [
            municipio_id, categoria_id, nombre?.trim(), direccion?.trim(), 
            telefono_whatsapp?.trim(), descripcion?.trim(), logo_url, 
            es_premium, size_visual, id
        ];

        const resultado = await pool.query(query, values);

        if (resultado.rowCount === 0) {
            return res.status(404).json({ status: 'error', message: 'Comercio no encontrado' });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Información del comercio actualizada',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Comercios Update Error]: ${error.message}`);
        
        // Error de integridad (municipio o categoría no existen)
        if (error.code === '23503') {
            return res.status(400).json({ status: 'error', message: 'El municipio o categoría no son válidos' });
        }

        return res.status(500).json({ status: 'error', message: 'Error al actualizar el comercio' });
    }
};

const eliminarComercio = async (req, res) => {
    const { id } = req.params;

    try {
        // Marcamos como inactivo. 
        // Senior Tip: Registramos la fecha de desactivación si tuviéramos una columna 'desactivado_en'
        const query = `
            UPDATE comercios 
            SET activo = FALSE 
            WHERE id = $1 AND activo = TRUE
            RETURNING nombre;
        `;

        const resultado = await pool.query(query, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'El comercio no existe o ya ha sido desactivado'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: `El comercio "${resultado.rows[0].nombre}" ha sido dado de baja correctamente`
        });

    } catch (error) {
        console.error(`[Comercios Soft-Delete Error]: ${error.message}`);
        return res.status(500).json({ status: 'error', message: 'Fallo al procesar la baja del comercio' });
    }
};

const obtenerComercioPorId = async (req, res) => {
    const { id } = req.params;

    // 1. Validación de tipo de dato
    if (isNaN(id)) {
        return res.status(400).json({
            status: 'error',
            message: 'El ID proporcionado no es un formato válido'
        });
    }

    try {
        // 2. Query con JOINs para traer nombres en lugar de solo IDs
        const query = `
            SELECT 
                c.*, 
                m.nombre as municipio_nombre, 
                cat.nombre as categoria_nombre
            FROM comercios c
            INNER JOIN municipios m ON c.municipio_id = m.id
            INNER JOIN categorias cat ON c.categoria_id = cat.id
            WHERE c.id = $1 AND c.activo = TRUE;
        `;

        const resultado = await pool.query(query, [id]);

        // 3. Verificación de existencia y estado activo
        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Comercio no encontrado o se encuentra inactivo'
            });
        }

        // 4. Respuesta con data estructurada
        return res.status(200).json({
            status: 'success',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Comercios Fetch ID Error]: ${error.message}`);
        return res.status(500).json({
            status: 'error',
            message: 'Error interno al obtener los detalles del comercio'
        });
    }
};


///////////////////////////////// ZONA DE ADMINISTRADORES DE COMERCIOS


const asignarAdministrador = async (req, res) => {
    const { usuario_id, comercio_id, nivel_acceso = 'total' } = req.body;

    // 1. Validación de integridad
    if (!usuario_id || !comercio_id) {
        return res.status(400).json({
            status: 'error',
            message: 'Se requiere el ID del usuario y del comercio'
        });
    }

    try {
        const query = `
            INSERT INTO administradores_comercios (usuario_id, comercio_id, nivel_acceso) 
            VALUES ($1, $2, $3) 
            RETURNING id, usuario_id, comercio_id, nivel_acceso, asignado_en;
        `;

        const values = [usuario_id, comercio_id, nivel_acceso.trim().toLowerCase()];
        const resultado = await pool.query(query, values);

        return res.status(201).json({
            status: 'success',
            message: 'Administrador asignado correctamente',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Admin-Comercio Error]: ${error.message}`);

        // Error 23505: El usuario ya es administrador de ese comercio específico
        if (error.code === '23505') {
            return res.status(409).json({
                status: 'error',
                message: 'Este usuario ya tiene acceso administrativo a este comercio'
            });
        }

        // Error 23503: El usuario_id o comercio_id no existen en sus tablas origen
        if (error.code === '23503') {
            return res.status(404).json({
                status: 'error',
                message: 'El usuario o el comercio no existen'
            });
        }

        return res.status(500).json({
            status: 'error',
            message: 'Fallo al procesar la asignación'
        });
    }
};

const obtenerAdministradores = async (req, res) => {
    try {
        // Filtros opcionales para buscar por un comercio específico o un usuario específico
        const { comercio_id, usuario_id } = req.query;
        
        let query = `
            SELECT 
                ac.id, ac.nivel_acceso, ac.asignado_en,
                u.nombre as usuario_nombre, u.email as usuario_email,
                c.nombre as comercio_nombre
            FROM administradores_comercios ac
            JOIN usuarios u ON ac.usuario_id = u.id
            JOIN comercios c ON ac.comercio_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (comercio_id) {
            params.push(comercio_id);
            query += ` AND ac.comercio_id = $${params.length}`;
        }

        if (usuario_id) {
            params.push(usuario_id);
            query += ` AND ac.usuario_id = $${params.length}`;
        }

        query += ` ORDER BY ac.asignado_en DESC`;

        const resultado = await pool.query(query, params);

        return res.status(200).json({
            status: 'success',
            results: resultado.rows.length,
            data: resultado.rows
        });

    } catch (error) {
        console.error(`[Admin-Comercio Fetch Error]: ${error.message}`);
        return res.status(500).json({
            status: 'error',
            message: 'Error al obtener la lista de administradores'
        });
    }
};

const editarPermisosAdmin = async (req, res) => {
    const { id } = req.params;
    const { nivel_acceso } = req.body;

    if (!nivel_acceso?.trim()) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'El nivel de acceso es requerido para la actualización' 
        });
    }

    try {
        const query = `
            UPDATE administradores_comercios 
            SET nivel_acceso = $1 
            WHERE id = $2 
            RETURNING id, usuario_id, comercio_id, nivel_acceso;
        `;

        const resultado = await pool.query(query, [nivel_acceso.trim().toLowerCase(), id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'No se encontró la asignación administrativa'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Nivel de acceso actualizado',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Admin Update Error]: ${error.message}`);
        return res.status(500).json({ status: 'error', message: 'Error al actualizar permisos' });
    }
};

const revocarAccesoAdmin = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Obtener el comercio_id de esta asignación antes de borrar
        const findQuery = `SELECT comercio_id FROM administradores_comercios WHERE id = $1`;
        const findRes = await pool.query(findQuery, [id]);

        if (findRes.rowCount === 0) {
            return res.status(404).json({ status: 'error', message: 'Asignación no encontrada' });
        }

        const comercioId = findRes.rows[0].comercio_id;

        // 2. Validar que no sea el último administrador con nivel 'total'
        const countQuery = `
            SELECT COUNT(*) FROM administradores_comercios 
            WHERE comercio_id = $1 AND nivel_acceso = 'total'
        `;
        const countRes = await pool.query(countQuery, [comercioId]);

        if (parseInt(countRes.rows[0].count) <= 1) {
            return res.status(403).json({
                status: 'error',
                message: 'No puedes eliminar al último administrador con acceso total de este comercio'
            });
        }

        // 3. Proceder con la eliminación
        const deleteQuery = `DELETE FROM administradores_comercios WHERE id = $1`;
        await pool.query(deleteQuery, [id]);

        return res.status(200).json({
            status: 'success',
            message: 'Acceso revocado exitosamente'
        });

    } catch (error) {
        console.error(`[Admin Delete Error]: ${error.message}`);
        return res.status(500).json({ status: 'error', message: 'Error al revocar el acceso' });
    }
};

const obtenerAdminComercioPorId = async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'ID de asignación no válido' 
        });
    }

    try {
        // Unimos con usuarios y comercios para dar una respuesta completa
        const query = `
            SELECT 
                ac.id, 
                ac.nivel_acceso, 
                ac.asignado_en,
                u.id as usuario_id,
                u.nombre as usuario_nombre,
                u.email as usuario_email,
                c.id as comercio_id,
                c.nombre as comercio_nombre
            FROM administradores_comercios ac
            INNER JOIN usuarios u ON ac.usuario_id = u.id
            INNER JOIN comercios c ON ac.comercio_id = c.id
            WHERE ac.id = $1 AND u.activo = TRUE AND c.activo = TRUE;
        `;

        const resultado = await pool.query(query, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'La asignación no existe o los registros asociados fueron desactivados'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[AdminComercios Fetch ID Error]: ${error.message}`);
        return res.status(500).json({ 
            status: 'error', 
            message: 'Error al consultar la asignación administrativa' 
        });
    }
};


/////////////////////////////// ZONA DE SUSCRIPCIONES

const crearSuscripcion = async (req, res) => {
    const { 
        comercio_id, fecha_inicio, fecha_vencimiento, 
        estado_pago = 'pendiente', metodo_pago 
    } = req.body;

    // 1. Validación de campos y lógica de negocio
    if (!comercio_id || !fecha_inicio || !fecha_vencimiento) {
        return res.status(400).json({
            status: 'error',
            message: 'Comercio y fechas de vigencia son obligatorios'
        });
    }

    if (new Date(fecha_vencimiento) <= new Date(fecha_inicio)) {
        return res.status(400).json({
            status: 'error',
            message: 'La fecha de vencimiento debe ser posterior a la de inicio'
        });
    }

    try {
        // 2. Normalización (Senior: estandariza estados para evitar 'Pendiente' vs 'pendiente')
        const estadoNormalizado = estado_pago.trim().toLowerCase();
        const metodoLimpio = metodo_pago?.trim().toLowerCase() || 'no especificado';

        const query = `
            INSERT INTO suscripciones (comercio_id, fecha_inicio, fecha_vencimiento, estado_pago, metodo_pago) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING id, comercio_id, fecha_vencimiento, estado_pago;
        `;

        const values = [comercio_id, fecha_inicio, fecha_vencimiento, estadoNormalizado, metodoLimpio];
        const resultado = await pool.query(query, values);

        return res.status(201).json({
            status: 'success',
            message: 'Suscripción registrada correctamente',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Suscripciones Create Error]: ${error.message}`);
        
        if (error.code === '23503') {
            return res.status(404).json({ status: 'error', message: 'El comercio no existe' });
        }

        return res.status(500).json({ status: 'error', message: 'Error al procesar la suscripción' });
    }
};

const obtenerSuscripciones = async (req, res) => {
    try {
        const { estado, solo_activas, comercio_id } = req.query;
        
        let query = `
            SELECT s.*, c.nombre as comercio_nombre 
            FROM suscripciones s
            JOIN comercios c ON s.comercio_id = c.id
            WHERE 1=1
        `;
        const params = [];

        // Filtro por estado de pago (pagado, pendiente, fallido)
        if (estado) {
            params.push(estado.toLowerCase());
            query += ` AND s.estado_pago = $${params.length}`;
        }

        // Filtro Senior: Mostrar solo las que están dentro del rango de fecha actual
        if (solo_activas === 'true') {
            query += ` AND CURRENT_DATE BETWEEN s.fecha_inicio AND s.fecha_vencimiento`;
            query += ` AND s.estado_pago = 'pagado'`; 
        }

        if (comercio_id) {
            params.push(comercio_id);
            query += ` AND s.comercio_id = $${params.length}`;
        }

        query += ` ORDER BY s.fecha_vencimiento DESC`;

        const resultado = await pool.query(query, params);

        return res.status(200).json({
            status: 'success',
            results: resultado.rows.length,
            data: resultado.rows
        });

    } catch (error) {
        console.error(`[Suscripciones Fetch Error]: ${error.message}`);
        return res.status(500).json({
            status: 'error',
            message: 'Error al obtener el listado de suscripciones'
        });
    }
};

const editarSuscripcion = async (req, res) => {
    const { id } = req.params;
    const { fecha_inicio, fecha_vencimiento, estado_pago, metodo_pago, activa } = req.body;

    try {
        // 1. Validar lógica de fechas si se intentan actualizar ambas o una sola
        const actual = await pool.query('SELECT fecha_inicio, fecha_vencimiento FROM suscripciones WHERE id = $1', [id]);
        
        if (actual.rowCount === 0) {
            return res.status(404).json({ status: 'error', message: 'Suscripción no encontrada' });
        }

        const inicio = new Date(fecha_inicio || actual.rows[0].fecha_inicio);
        const vencimiento = new Date(fecha_vencimiento || actual.rows[0].fecha_vencimiento);

        if (vencimiento <= inicio) {
            return res.status(400).json({
                status: 'error',
                message: 'La fecha de vencimiento debe ser posterior al inicio'
            });
        }

        // 2. Update con normalización de strings
        const query = `
            UPDATE suscripciones 
            SET 
                fecha_inicio = COALESCE($1, fecha_inicio),
                fecha_vencimiento = COALESCE($2, fecha_vencimiento),
                estado_pago = COALESCE($3, estado_pago),
                metodo_pago = COALESCE($4, metodo_pago),
                activa = COALESCE($5, activa)
            WHERE id = $6
            RETURNING *;
        `;

        const values = [
            fecha_inicio, 
            fecha_vencimiento, 
            estado_pago?.trim().toLowerCase(), 
            metodo_pago?.trim().toLowerCase(), 
            activa,
            id
        ];

        const resultado = await pool.query(query, values);

        return res.status(200).json({
            status: 'success',
            message: 'Suscripción actualizada correctamente',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Suscripciones Update Error]: ${error.message}`);
        return res.status(500).json({ status: 'error', message: 'Error al actualizar la suscripción' });
    }
};

const cancelarSuscripcion = async (req, res) => {
    const { id } = req.params;

    try {
        // En suscripciones, el borrado lógico suele llamarse "Cancelación"
        const query = `
            UPDATE suscripciones 
            SET activa = FALSE, estado_pago = 'cancelado' 
            WHERE id = $1 AND activa = TRUE
            RETURNING id, comercio_id;
        `;

        const resultado = await pool.query(query, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Suscripción no encontrada o ya está inactiva'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Suscripción cancelada exitosamente. Se mantiene registro histórico.'
        });

    } catch (error) {
        console.error(`[Suscripciones Delete Error]: ${error.message}`);
        return res.status(500).json({ status: 'error', message: 'Fallo al procesar la baja de la suscripción' });
    }
};

const obtenerSuscripcionPorId = async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'El ID de suscripción no es válido' 
        });
    }

    try {
        // Enriquecemos con datos del comercio y calculamos días restantes
        const query = `
            SELECT 
                s.*, 
                c.nombre as comercio_nombre,
                (s.fecha_vencimiento - CURRENT_DATE) as dias_para_vencimiento,
                CASE 
                    WHEN s.fecha_vencimiento < CURRENT_DATE THEN 'expirada'
                    WHEN s.fecha_vencimiento <= CURRENT_DATE + INTERVAL '5 days' THEN 'por_vencer'
                    ELSE 'vigente'
                END as semaforo_estado
            FROM suscripciones s
            INNER JOIN comercios c ON s.comercio_id = c.id
            WHERE s.id = $1 AND s.activa = TRUE;
        `;

        const resultado = await pool.query(query, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Suscripción no encontrada o ya no está activa en el sistema'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Suscripciones Fetch ID Error]: ${error.message}`);
        return res.status(500).json({ 
            status: 'error', 
            message: 'Error al consultar la información de suscripción' 
        });
    }
};


module.exports = {
    
    crearComercio,
    obtenerComercios,
    editarComercio,
    eliminarComercio,
    obtenerComercioPorId,
    
    
    asignarAdministrador,
    obtenerAdminComercioPorId,
    obtenerAdministradores,
    editarPermisosAdmin,
    revocarAccesoAdmin,
   
    crearSuscripcion,
    obtenerSuscripciones,
    obtenerSuscripcionPorId,
    editarSuscripcion,
    cancelarSuscripcion,
    
    

};