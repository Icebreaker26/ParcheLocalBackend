const pool = require('../db/database');

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

module.exports ={
    crearMunicipio,
    obtenerMunicipios,
    editarMunicipio,
    eliminarMunicipio,
    obtenerMunicipioPorId,
    
    crearCategoria,
    obtenerCategorias,
    editarCategoria,
    eliminarCategoria,
    obtenerCategoriaPorId
};
