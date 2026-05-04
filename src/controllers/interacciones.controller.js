const pool = require('../db/database');

///////////////////////////////// ZONA DE RESEÑAS

const crearResena = async (req, res) => {
    const { comercio_id, usuario_id, calificacion, comentario } = req.body;

    // 1. Validación de entrada (Fail-Fast)
    if (!comercio_id || !usuario_id || !calificacion) {
        return res.status(400).json({
            status: 'error',
            message: 'Comercio, usuario y calificación son obligatorios'
        });
    }

    // Validación de rango (Senior: no confíes solo en el CHECK de la DB)
    if (calificacion < 1 || calificacion > 5) {
        return res.status(400).json({
            status: 'error',
            message: 'La calificación debe estar entre 1 y 5'
        });
    }

    try {
        const query = `
            INSERT INTO resenas (comercio_id, usuario_id, calificacion, comentario) 
            VALUES ($1, $2, $3, $4) 
            RETURNING id, calificacion, creado_en;
        `;

        const values = [comercio_id, usuario_id, calificacion, comentario?.trim()];
        const resultado = await pool.query(query, values);

        return res.status(201).json({
            status: 'success',
            message: 'Reseña publicada correctamente',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Reseñas Create Error]: ${error.message}`);
        
        if (error.code === '23503') {
            return res.status(404).json({ status: 'error', message: 'Usuario o comercio no existente' });
        }

        return res.status(500).json({ status: 'error', message: 'Error al procesar la reseña' });
    }
};

const obtenerResenasPorComercio = async (req, res) => {
    const { comercio_id } = req.params;

    try {
        // 1. Consulta de las reseñas con el nombre del usuario
        const queryResenas = `
            SELECT r.id, r.calificacion, r.comentario, r.creado_en, u.nombre as usuario_nombre
            FROM resenas r
            JOIN usuarios u ON r.usuario_id = u.id
            WHERE r.comercio_id = $1
            ORDER BY r.creado_en DESC;
        `;

        // 2. Consulta del promedio y total (Senior: entrega métricas calculadas)
        const queryStats = `
            SELECT 
                COUNT(*) as total_resenas,
                ROUND(AVG(calificacion), 1) as promedio
            FROM resenas
            WHERE comercio_id = $1;
        `;

        const [resenasResult, statsResult] = await Promise.all([
            pool.query(queryResenas, [comercio_id]),
            pool.query(queryStats, [comercio_id])
        ]);

        return res.status(200).json({
            status: 'success',
            stats: statsResult.rows[0],
            results: resenasResult.rows.length,
            data: resenasResult.rows
        });

    } catch (error) {
        console.error(`[Resenas Fetch Error]: ${error.message}`);
        return res.status(500).json({
            status: 'error',
            message: 'Error al obtener las reseñas del comercio'
        });
    }
};

const editarResena = async (req, res) => {
    const { id } = req.params;
    const { calificacion, comentario } = req.body;

    // 1. Validación de rango (Defensa en profundidad)
    if (calificacion && (calificacion < 1 || calificacion > 5)) {
        return res.status(400).json({
            status: 'error',
            message: 'La calificación debe estar entre 1 y 5'
        });
    }

    try {
        const query = `
            UPDATE resenas 
            SET 
                calificacion = COALESCE($1, calificacion),
                comentario = COALESCE($2, comentario)
            WHERE id = $3
            RETURNING id, calificacion, comentario, creado_en;
        `;

        const values = [calificacion, comentario?.trim(), id];
        const resultado = await pool.query(query, values);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Reseña no encontrada'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Reseña actualizada',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Resenas Update Error]: ${error.message}`);
        return res.status(500).json({ status: 'error', message: 'Error al actualizar la reseña' });
    }
};  

const eliminarResena = async (req, res) => {
    const { id } = req.params;

    try {
        // Soft delete: cambiamos el estado
        const query = `
            UPDATE resenas 
            SET activa = FALSE 
            WHERE id = $1 AND activa = TRUE
            RETURNING id;
        `;

        const resultado = await pool.query(query, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'La reseña no existe o ya fue eliminada'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Reseña eliminada correctamente'
        });

    } catch (error) {
        console.error(`[Resenas Delete Error]: ${error.message}`);
        return res.status(500).json({ status: 'error', message: 'Fallo al eliminar la reseña' });
    }
};

const obtenerResenaPorId = async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'El ID de la reseña no es válido' 
        });
    }

    try {
        // Enlazamos con usuario y comercio para dar contexto total
        const query = `
            SELECT 
                r.id, 
                r.calificacion, 
                r.comentario, 
                r.creado_en,
                u.nombre as usuario_nombre,
                c.nombre as comercio_nombre,
                c.logo_url as comercio_logo
            FROM resenas r
            INNER JOIN usuarios u ON r.usuario_id = u.id
            INNER JOIN comercios c ON r.comercio_id = c.id
            WHERE r.id = $1 AND r.activa = TRUE AND u.activo = TRUE AND c.activo = TRUE;
        `;

        const resultado = await pool.query(query, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Reseña no encontrada o el contenido ya no está disponible'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Resenas Fetch ID Error]: ${error.message}`);
        return res.status(500).json({ 
            status: 'error', 
            message: 'Error al intentar obtener el detalle de la reseña' 
        });
    }
};

/////////////////////// METRICAS

const registrarInteraccion = async (req, res) => {
    const { comercio_id, usuario_id = null, tipo_accion, dispositivo } = req.body;

    // 1. Validación mínima (Senior: No bloquees al usuario por una métrica)
    if (!comercio_id || !tipo_accion) {
        return res.status(400).json({
            status: 'error',
            message: 'Comercio y tipo de acción son requeridos'
        });
    }

    try {
        // 2. Normalización de la acción (Ej: 'WHATSAPP_CLICK', 'VIEW_PROFILE')
        const accionNormalizada = tipo_accion.trim().toUpperCase();

        const query = `
            INSERT INTO metricas_interacciones (comercio_id, usuario_id, tipo_accion, dispositivo) 
            VALUES ($1, $2, $3, $4) 
            RETURNING id, fecha_hora;
        `;

        const values = [comercio_id, usuario_id, accionNormalizada, dispositivo?.trim()];
        
        const resultado = await pool.query(query, values);

        return res.status(201).json({
            status: 'success',
            data: resultado.rows[0]
        });

    } catch (error) {
        // Logueamos el error pero podrías considerar no romper la experiencia del usuario
        console.error(`[Metrics Error]: ${error.message}`);
        return res.status(500).json({ status: 'error', message: 'Error al registrar métrica' });
    }
};

const obtenerMetricasComercio = async (req, res) => {
    const { comercio_id } = req.params;
    const { dias = 30 } = req.query; // Por defecto últimos 30 días

    try {
        // Consulta avanzada: Total por tipo de acción y total de usuarios únicos
        const queryResumen = `
            SELECT 
                tipo_accion, 
                COUNT(*) as total,
                COUNT(DISTINCT usuario_id) as usuarios_unicos
            FROM metricas_interacciones
            WHERE comercio_id = $1 
            AND fecha_hora > CURRENT_DATE - INTERVAL '1 day' * $2
            GROUP BY tipo_accion
            ORDER BY total DESC;
        `;

        const resultado = await pool.query(queryResumen, [comercio_id, dias]);

        // 2. Calculamos un total general rápido
        const totalGeneral = resultado.rows.reduce((acc, row) => acc + parseInt(row.total), 0);

        return res.status(200).json({
            status: 'success',
            periodo_dias: dias,
            total_acumulado: totalGeneral,
            metricas: resultado.rows
        });

    } catch (error) {
        console.error(`[Metrics Fetch Error]: ${error.message}`);
        return res.status(500).json({
            status: 'error',
            message: 'Error al generar reporte de métricas'
        });
    }
};


const obtenerMetricaPorId = async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'El ID de métrica no es válido' 
        });
    }

    try {
        // Enriquecemos con el nombre del comercio y el usuario (si existe)
        const query = `
            SELECT 
                m.id, 
                m.tipo_accion, 
                m.fecha_hora, 
                m.dispositivo,
                c.nombre as comercio_nombre,
                u.nombre as usuario_nombre,
                u.email as usuario_email
            FROM metricas_interacciones m
            LEFT JOIN comercios c ON m.comercio_id = c.id
            LEFT JOIN usuarios u ON m.usuario_id = u.id
            WHERE m.id = $1;
        `;

        const resultado = await pool.query(query, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Registro de interacción no encontrado'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Metricas Fetch ID Error]: ${error.message}`);
        return res.status(500).json({ 
            status: 'error', 
            message: 'Error al consultar el log de interacción' 
        });
    }
};

module.exports ={

    obtenerResenasPorComercio,
    crearResena,
    obtenerResenaPorId,
    editarResena,
    eliminarResena,

    obtenerMetricasComercio,
    obtenerMetricaPorId,
    registrarInteraccion

};