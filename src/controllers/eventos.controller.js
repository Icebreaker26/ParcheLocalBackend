const pool = require('../db/database');
///////////////////////////////// ZONA DE EVENTOS

const crearEvento = async (req, res) => {
    const { 
        comercio_id, titulo, descripcion, precio_cover = 0, 
        fecha_inicio, fecha_fin, imagen_url 
    } = req.body;

    // 1. Validación de campos obligatorios y lógica de fechas
    if (!comercio_id || !titulo || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({
            status: 'error',
            message: 'Faltan datos obligatorios (comercio, título y fechas)'
        });
    }

    const inicio = new Date(fecha_inicio);
    const fin = new Date(fecha_fin);

    if (fin <= inicio) {
        return res.status(400).json({
            status: 'error',
            message: 'La fecha de finalización debe ser posterior a la de inicio'
        });
    }

    try {
        // 2. Query con retorno de datos clave
        const query = `
            INSERT INTO eventos 
            (comercio_id, titulo, descripcion, precio_cover, fecha_inicio, fecha_fin, imagen_url) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING id, titulo, precio_cover, fecha_inicio;
        `;

        const values = [
            comercio_id, 
            titulo.trim(), 
            descripcion?.trim(), 
            parseFloat(precio_cover), // Aseguramos que sea un número decimal
            fecha_inicio, 
            fecha_fin, 
            imagen_url
        ];

        const resultado = await pool.query(query, values);

        return res.status(201).json({
            status: 'success',
            message: 'Evento publicado con éxito',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Eventos Create Error]: ${error.message}`);
        
        if (error.code === '23503') {
            return res.status(404).json({ 
                status: 'error', 
                message: 'El comercio especificado no existe' 
            });
        }

        return res.status(500).json({
            status: 'error',
            message: 'Fallo al crear el evento'
        });
    }
};

const obtenerEventos = async (req, res) => {
    try {
        const { proximos, comercio_id } = req.query;
        
        let query = `
            SELECT e.*, c.nombre as comercio_nombre 
            FROM eventos e
            JOIN comercios c ON e.comercio_id = c.id
            WHERE 1=1
        `;
        const params = [];

        // Filtro: Solo eventos que no han terminado (útil para la App)
        if (proximos === 'true') {
            query += ` AND e.fecha_fin >= CURRENT_TIMESTAMP`;
        }

        // Filtro: Eventos de un comercio específico
        if (comercio_id) {
            params.push(comercio_id);
            query += ` AND e.comercio_id = $${params.length}`;
        }

        query += ` ORDER BY e.fecha_inicio ASC`;

        const resultado = await pool.query(query, params);

        return res.status(200).json({
            status: 'success',
            results: resultado.rows.length,
            data: resultado.rows
        });

    } catch (error) {
        console.error(`[Eventos Fetch Error]: ${error.message}`);
        return res.status(500).json({
            status: 'error',
            message: 'Error al obtener la agenda de eventos'
        });
    }
};


const editarEvento = async (req, res) => {
    const { id } = req.params;
    const { titulo, descripcion, precio_cover, fecha_inicio, fecha_fin, imagen_url } = req.body;

    try {
        // 1. Obtener datos actuales para validar fechas si solo se envía una
        const eventoActual = await pool.query('SELECT fecha_inicio, fecha_fin FROM eventos WHERE id = $1', [id]);
        
        if (eventoActual.rowCount === 0) {
            return res.status(404).json({ status: 'error', message: 'Evento no encontrado' });
        }

        const inicio = new Date(fecha_inicio || eventoActual.rows[0].fecha_inicio);
        const fin = new Date(fecha_fin || eventoActual.rows[0].fecha_fin);

        if (fin <= inicio) {
            return res.status(400).json({
                status: 'error',
                message: 'La fecha de finalización debe ser posterior a la de inicio'
            });
        }

        // 2. Update usando COALESCE
        const query = `
            UPDATE eventos 
            SET 
                titulo = COALESCE($1, titulo),
                descripcion = COALESCE($2, descripcion),
                precio_cover = COALESCE($3, precio_cover),
                fecha_inicio = COALESCE($4, fecha_inicio),
                fecha_fin = COALESCE($5, fecha_fin),
                imagen_url = COALESCE($6, imagen_url)
            WHERE id = $7
            RETURNING *;
        `;

        const values = [
            titulo?.trim(), 
            descripcion?.trim(), 
            precio_cover, 
            fecha_inicio, 
            fecha_fin, 
            imagen_url, 
            id
        ];

        const resultado = await pool.query(query, values);

        return res.status(200).json({
            status: 'success',
            message: 'Evento actualizado correctamente',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Eventos Update Error]: ${error.message}`);
        return res.status(500).json({ status: 'error', message: 'Error al actualizar el evento' });
    }
};


const eliminarEvento = async (req, res) => {
    const { id } = req.params;

    try {
        const query = `
            UPDATE eventos 
            SET activo = FALSE 
            WHERE id = $1 AND activo = TRUE
            RETURNING titulo;
        `;

        const resultado = await pool.query(query, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'El evento no existe o ya fue eliminado'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: `El evento "${resultado.rows[0].titulo}" ha sido cancelado/eliminado.`
        });

    } catch (error) {
        console.error(`[Eventos Delete Error]: ${error.message}`);
        return res.status(500).json({ status: 'error', message: 'Fallo al eliminar el evento' });
    }
};

const obtenerEventoPorId = async (req, res) => {
    const { id } = req.params;

    // 1. Validación de tipo de dato
    if (isNaN(id)) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'El ID del evento no es válido' 
        });
    }

    try {
        // 2. Query con JOIN para saber de qué comercio es el evento
        const query = `
            SELECT 
                e.*, 
                c.nombre as comercio_nombre, 
                c.logo_url as comercio_logo,
                c.direccion as comercio_direccion
            FROM eventos e
            INNER JOIN comercios c ON e.comercio_id = c.id
            WHERE e.id = $1 AND e.activo = TRUE AND c.activo = TRUE;
        `;

        const resultado = await pool.query(query, [id]);

        // 3. Verificación de existencia y estado de salud de la relación
        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Evento no encontrado o el comercio ya no está activo'
            });
        }

        // 4. Formateo de respuesta (Opcional: puedes añadir lógica de "estado" del evento aquí)
        const evento = resultado.rows[0];
        const ahora = new Date();
        const finalizado = new Date(evento.fecha_fin) < ahora;

        return res.status(200).json({
            status: 'success',
            data: {
                ...evento,
                esta_finalizado: finalizado // Senior Tip: ayuda al frontend con lógica de negocio
            }
        });

    } catch (error) {
        console.error(`[Eventos Fetch ID Error]: ${error.message}`);
        return res.status(500).json({ 
            status: 'error', 
            message: 'Error interno al consultar los detalles del evento' 
        });
    }
};

/////////////////////////////// ZONA DE PROMOCIONES

const crearPromocionFlash = async (req, res) => {
    const { comercio_id, descripcion, expira_en, activa = true } = req.body;

    // 1. Validación de campos y lógica temporal
    if (!comercio_id || !descripcion?.trim() || !expira_en) {
        return res.status(400).json({
            status: 'error',
            message: 'Comercio, descripción y fecha de expiración son obligatorios'
        });
    }

    const expiracion = new Date(expira_en);
    if (expiracion <= new Date()) {
        return res.status(400).json({
            status: 'error',
            message: 'La promoción debe expirar en un momento futuro'
        });
    }

    try {
        const query = `
            INSERT INTO promociones_flash (comercio_id, descripcion, expira_en, activa) 
            VALUES ($1, $2, $3, $4) 
            RETURNING id, comercio_id, descripcion, expira_en;
        `;

        const values = [comercio_id, descripcion.trim(), expira_en, activa];
        const resultado = await pool.query(query, values);

        return res.status(201).json({
            status: 'success',
            message: 'Promoción flash publicada',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Flash Promo Create Error]: ${error.message}`);
        
        if (error.code === '23503') {
            return res.status(404).json({ status: 'error', message: 'El comercio no existe' });
        }

        return res.status(500).json({ status: 'error', message: 'Fallo al crear la promoción' });
    }
};


const obtenerPromocionesFlash = async (req, res) => {
    try {
        const { comercio_id, incluir_vencidas } = req.query;
        
        // Unimos con comercios para mostrar quién ofrece la promo y su logo
        let query = `
            SELECT p.*, c.nombre as comercio_nombre, c.logo_url 
            FROM promociones_flash p
            JOIN comercios c ON p.comercio_id = c.id
            WHERE p.activa = TRUE
        `;
        const params = [];

        // Filtro Senior: Por defecto, solo mostrar lo que NO ha expirado
        if (incluir_vencidas !== 'true') {
            query += ` AND p.expira_en > CURRENT_TIMESTAMP`;
        }

        if (comercio_id) {
            params.push(comercio_id);
            query += ` AND p.comercio_id = $${params.length}`;
        }

        query += ` ORDER BY p.expira_en ASC`;

        const resultado = await pool.query(query, params);

        return res.status(200).json({
            status: 'success',
            results: resultado.rows.length,
            data: resultado.rows
        });

    } catch (error) {
        console.error(`[Flash Promo Fetch Error]: ${error.message}`);
        return res.status(500).json({
            status: 'error',
            message: 'Error al obtener las promociones flash'
        });
    }
};

const editarPromocionFlash = async (req, res) => {
    const { id } = req.params;
    const { descripcion, expira_en, activa } = req.body;

    try {
        // 1. Validar si la promoción ya expiró antes de intentar editarla
        const checkPromo = await pool.query(
            'SELECT expira_en FROM promociones_flash WHERE id = $1', 
            [id]
        );

        if (checkPromo.rowCount === 0) {
            return res.status(404).json({ status: 'error', message: 'Promoción no encontrada' });
        }

        // 2. Si se envía una nueva fecha, validar que sea futura
        if (expira_en && new Date(expira_en) <= new Date()) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'La nueva fecha de expiración debe ser en el futuro' 
            });
        }

        const query = `
            UPDATE promociones_flash 
            SET 
                descripcion = COALESCE($1, descripcion),
                expira_en = COALESCE($2, expira_en),
                activa = COALESCE($3, activa)
            WHERE id = $4
            RETURNING *;
        `;

        const values = [descripcion?.trim(), expira_en, activa, id];
        const resultado = await pool.query(query, values);

        return res.status(200).json({
            status: 'success',
            message: 'Promoción flash actualizada',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Flash Promo Update Error]: ${error.message}`);
        return res.status(500).json({ status: 'error', message: 'Error al actualizar la promoción' });
    }
};

const eliminarPromocionFlash = async (req, res) => {
    const { id } = req.params;

    try {
        const query = `
            UPDATE promociones_flash 
            SET activa = FALSE 
            WHERE id = $1 AND activa = TRUE
            RETURNING descripcion;
        `;

        const resultado = await pool.query(query, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'La promoción ya no existe o ya estaba inactiva'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: `La promoción "${resultado.rows[0].descripcion}" ha sido retirada.`
        });

    } catch (error) {
        console.error(`[Flash Promo Delete Error]: ${error.message}`);
        return res.status(500).json({ status: 'error', message: 'Fallo al eliminar la promoción' });
    }
};

const obtenerPromocionFlashPorId = async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'ID de promoción no válido' 
        });
    }

    try {
        // Enriquecemos con datos del comercio y validamos salud de la relación
        const query = `
            SELECT 
                p.*, 
                c.nombre as comercio_nombre,
                c.logo_url as comercio_logo,
                (p.expira_en > CURRENT_TIMESTAMP) as es_vigente
            FROM promociones_flash p
            INNER JOIN comercios c ON p.comercio_id = c.id
            WHERE p.id = $1 AND p.activa = TRUE AND c.activo = TRUE;
        `;

        const resultado = await pool.query(query, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'La promoción no existe, ya expiró o el comercio no está disponible'
            });
        }

        const promo = resultado.rows[0];

        // Un toque Senior: Si el frontend intenta acceder a una promo ya expirada por ID directo
        if (!promo.es_vigente) {
            return res.status(410).json({ // 410 Gone: El recurso existía pero ya no está disponible
                status: 'error',
                message: 'Esta promoción flash ha expirado',
                data: { expirado_en: promo.expira_en }
            });
        }

        return res.status(200).json({
            status: 'success',
            data: promo
        });

    } catch (error) {
        console.error(`[FlashPromo Fetch ID Error]: ${error.message}`);
        return res.status(500).json({ 
            status: 'error', 
            message: 'Error al consultar la promoción flash' 
        });
    }
};

module.exports ={

    crearEvento,
    obtenerEventos,
    editarEvento,
    eliminarEvento,
    obtenerEventoPorId,
    
    crearPromocionFlash,
    obtenerPromocionFlashPorId,
    obtenerPromocionesFlash,
    editarPromocionFlash,
    eliminarPromocionFlash,

};