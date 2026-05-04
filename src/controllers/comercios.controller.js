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

///////////////////////////////// ZONA DE MUNICIPIOS

const crearMunicipio = async (req, res) => {
    const { nombre, departamento, estado = true } = req.body;

    // 1. Validación de campos obligatorios
    if (!nombre?.trim() || !departamento?.trim()) {
        return res.status(400).json({
            status: 'error',
            message: 'El nombre y el departamento son campos obligatorios'
        });
    }

    try {
        // 2. Normalización de strings (Ej: "la virginia" -> "La Virginia")
        const formatearTexto = (str) => str.trim().toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
        
        const nombreLimpio = formatearTexto(nombre);
        const deptoLimpio = formatearTexto(departamento);

        const query = `
            INSERT INTO municipios (nombre, departamento, estado) 
            VALUES ($1, $2, $3) 
            RETURNING id, nombre, departamento, estado;
        `;

        const resultado = await pool.query(query, [nombreLimpio, deptoLimpio, estado]);

        return res.status(201).json({
            status: 'success',
            message: 'Municipio registrado exitosamente',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Municipios Create Error]: ${error.message}`);
        return res.status(500).json({
            status: 'error',
            message: 'Fallo interno al registrar el municipio'
        });
    }
};

const obtenerMunicipios = async (req, res) => {
    try {
        // 1. Extracción de filtros desde la URL (query params)
        const { depto, activo } = req.query;
        
        let query = `SELECT id, nombre, departamento, estado FROM municipios WHERE 1=1`;
        const params = [];

        // 2. Construcción dinámica de la consulta
        if (depto) {
            params.push(`%${depto}%`);
            query += ` AND departamento ILIKE $${params.length}`; // ILIKE para búsqueda sin distinguir mayúsculas
        }

        if (activo !== undefined) {
            params.push(activo === 'true');
            query += ` AND estado = $${params.length}`;
        }

        query += ` ORDER BY departamento ASC, nombre ASC`;

        const resultado = await pool.query(query, params);

        return res.status(200).json({
            status: 'success',
            results: resultado.rows.length,
            data: resultado.rows
        });

    } catch (error) {
        console.error(`[Municipios Fetch Error]: ${error.message}`);
        return res.status(500).json({
            status: 'error',
            message: 'Error al obtener la lista de municipios'
        });
    }
};

const editarMunicipio = async (req, res) => {
    const { id } = req.params;
    const { nombre, departamento, estado } = req.body;

    try {
        // Normalizamos los textos si vienen presentes
        const nombreLimpio = nombre ? nombre.trim() : null;
        const deptoLimpio = departamento ? departamento.trim() : null;

        const query = `
            UPDATE municipios 
            SET 
                nombre = COALESCE($1, nombre), 
                departamento = COALESCE($2, departamento), 
                estado = COALESCE($3, estado)
            WHERE id = $4
            RETURNING id, nombre, departamento, estado;
        `;

        const valores = [nombreLimpio, deptoLimpio, estado, id];
        const resultado = await pool.query(query, valores);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Municipio no encontrado'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Municipio actualizado correctamente',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Municipios Update Error]: ${error.message}`);
        return res.status(500).json({ 
            status: 'error', 
            message: 'Error al intentar actualizar el municipio' 
        });
    }
};

const eliminarMunicipio = async (req, res) => {
    const { id } = req.params;

    try {
        // En lugar de borrar, desactivamos
        const query = `
            UPDATE municipios 
            SET estado = FALSE 
            WHERE id = $1 AND estado = TRUE
            RETURNING nombre;
        `;

        const resultado = await pool.query(query, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'El municipio no existe o ya se encuentra desactivado'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: `El municipio "${resultado.rows[0].nombre}" ha sido desactivado del sistema`
        });

    } catch (error) {
        console.error(`[Municipios Delete Error]: ${error.message}`);
        return res.status(500).json({ 
            status: 'error', 
            message: 'Error interno al intentar dar de baja el municipio' 
        });
    }
};

const obtenerMunicipioPorId = async (req, res) => {
    const { id } = req.params;

    // Validación de tipo de dato para evitar errores de cast en DB
    if (isNaN(id)) {
        return res.status(400).json({ status: 'error', message: 'ID inválido' });
    }

    try {
        const query = `
            SELECT id, nombre, departamento, estado 
            FROM municipios 
            WHERE id = $1 AND estado = TRUE;
        `;

        const resultado = await pool.query(query, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Municipio no encontrado o inactivo'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Municipio Fetch ID Error]: ${error.message}`);
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
};

///////////////////////////////// ZONA DE CATEGORIAS

const crearCategoria = async (req, res) => {
    const { nombre, icono_url } = req.body;

    // 1. Validación de campos críticos
    if (!nombre || nombre.trim().length === 0) {
        return res.status(400).json({
            status: 'error',
            message: 'El nombre de la categoría es obligatorio'
        });
    }

    try {
        // 2. Normalización de datos
        // Capitalizamos la primera letra para consistencia visual
        const nombreLimpio = nombre.trim().charAt(0).toUpperCase() + nombre.trim().slice(1).toLowerCase();
        const urlLimpia = icono_url?.trim() || null;

        const query = `
            INSERT INTO categorias (nombre, icono_url) 
            VALUES ($1, $2) 
            RETURNING id, nombre, icono_url;
        `;

        const resultado = await pool.query(query, [nombreLimpio, urlLimpia]);

        return res.status(201).json({
            status: 'success',
            message: 'Categoría creada con éxito',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Categorias Create Error]: ${error.message}`);
        
        // Manejo de duplicados si decides poner UNIQUE al nombre después
        if (error.code === '23505') {
            return res.status(409).json({
                status: 'error',
                message: 'Esta categoría ya existe'
            });
        }

        return res.status(500).json({
            status: 'error',
            message: 'Error interno al crear la categoría'
        });
    }
};

const obtenerCategorias = async (req, res) => {
    try {
        const { search } = req.query;
        
        let query = `SELECT id, nombre, icono_url FROM categorias`;
        const params = [];

        // 1. Búsqueda dinámica si existe el parámetro 'search'
        if (search) {
            params.push(`%${search.trim()}%`);
            query += ` WHERE nombre ILIKE $1`;
        }

        query += ` ORDER BY nombre ASC`;

        const resultado = await pool.query(query, params);

        // 2. Respuesta estándar
        return res.status(200).json({
            status: 'success',
            results: resultado.rows.length,
            data: resultado.rows
        });

    } catch (error) {
        console.error(`[Categorias Fetch Error]: ${error.message}`);
        return res.status(500).json({
            status: 'error',
            message: 'Error al obtener las categorías'
        });
    }
};

const editarCategoria = async (req, res) => {
    const { id } = req.params;
    const { nombre, icono_url, activa } = req.body;

    try {
        // Normalización básica
        const nombreLimpio = nombre ? nombre.trim() : null;

        const query = `
            UPDATE categorias 
            SET 
                nombre = COALESCE($1, nombre), 
                icono_url = COALESCE($2, icono_url),
                activa = COALESCE($3, activa)
            WHERE id = $4
            RETURNING id, nombre, icono_url, activa;
        `;

        const values = [nombreLimpio, icono_url, activa, id];
        const resultado = await pool.query(query, values);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Categoría no encontrada'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Categoría actualizada con éxito',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Categorias Update Error]: ${error.message}`);
        return res.status(500).json({ 
            status: 'error', 
            message: 'Error al actualizar la categoría' 
        });
    }
};

const eliminarCategoria = async (req, res) => {
    const { id } = req.params;

    try {
        // Verificamos si hay comercios activos usando esta categoría antes de desactivarla
        // Esto es un toque Senior: Advertir si la categoría está "poblada"
        const checkQuery = `SELECT COUNT(*) FROM comercios WHERE categoria_id = $1 AND activo = TRUE`;
        const checkRes = await pool.query(checkQuery, [id]);
        
        const count = parseInt(checkRes.rows[0].count);

        const query = `
            UPDATE categorias 
            SET activa = FALSE 
            WHERE id = $1 AND activa = TRUE
            RETURNING nombre;
        `;

        const resultado = await pool.query(query, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'La categoría no existe o ya está inactiva'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: `Categoría "${resultado.rows[0].nombre}" desactivada.`,
            advertencia: count > 0 ? `Hay ${count} comercios que aún usan esta categoría.` : null
        });

    } catch (error) {
        console.error(`[Categorias Delete Error]: ${error.message}`);
        return res.status(500).json({ 
            status: 'error', 
            message: 'No se pudo desactivar la categoría' 
        });
    }
};

const obtenerCategoriaPorId = async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
        return res.status(400).json({ status: 'error', message: 'ID de categoría inválido' });
    }

    try {
        const query = `
            SELECT id, nombre, icono_url, activa 
            FROM categorias 
            WHERE id = $1 AND activa = TRUE;
        `;

        const resultado = await pool.query(query, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'La categoría no existe o ha sido dada de baja'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error(`[Categoria Fetch ID Error]: ${error.message}`);
        return res.status(500).json({ status: 'error', message: 'Error al obtener la categoría' });
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

module.exports = {
    crearRol,
    obtenerRoles,
    editarRol,
    eliminarRol,
    obtenerRolPorId,
    crearComercio,
    obtenerComercios,
    editarComercio,
    eliminarComercio,
    obtenerComercioPorId,
    crearMunicipio,
    obtenerMunicipios,
    editarMunicipio,
    eliminarMunicipio,
    obtenerMunicipioPorId,
    crearCategoria,
    obtenerCategorias,
    editarCategoria,
    eliminarCategoria,
    obtenerCategoriaPorId,
    crearUsuario,
    obtenerUsuarios,
    editarUsuario,
    eliminarUsuario,
    obtenerUsuarioPorId,
    asignarAdministrador,
    obtenerAdminComercioPorId,
    obtenerAdministradores,
    editarPermisosAdmin,
    revocarAccesoAdmin,
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
    crearSuscripcion,
    obtenerSuscripciones,
    obtenerSuscripcionPorId,
    editarSuscripcion,
    cancelarSuscripcion,
    agregarFavorito,
    obtenerFavoritoPorId,
    obtenerFavoritosPorUsuario,
    eliminarFavorito,
    obtenerResenasPorComercio,
    crearResena,
    obtenerResenaPorId,
    editarResena,
    eliminarResena,
    obtenerMetricasComercio,
    obtenerMetricaPorId,
    registrarInteraccion,
    
};