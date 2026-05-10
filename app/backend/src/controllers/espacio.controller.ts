import { Request, Response } from 'express';
import db from '../config/db';
import { HttpStatus } from '../utils/httpStatus';

export const obtenerEspacios = async (req: Request, res: Response) => {
  try {
    const fecha = req.query.fecha as string;
    const hora_inicio = req.query.hora_inicio as string;
    const hora_fin = req.query.hora_fin as string;

    const tieneUnParametro = fecha || hora_inicio || hora_fin;
    const tieneTodosLosParametros = fecha && hora_inicio && hora_fin;

    if (tieneUnParametro && !tieneTodosLosParametros) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Debe enviar fecha, hora_inicio y hora_fin para consultar disponibilidad'
      });
    }

    // comportamiento actual si no vienen params
    if (!tieneTodosLosParametros) {
      const [espacios]: any = await db.query(
        'SELECT * FROM espacio ORDER BY nombre ASC'
      );

      return res.status(HttpStatus.OK).json(espacios);
    }

    if (hora_inicio >= hora_fin) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'La hora de inicio debe ser menor que la hora de fin'
      });
    }

    const [espacios]: any = await db.query(
      `SELECT 
         e.id,
         e.nombre,
         e.capacidad,
         CASE
           WHEN EXISTS (
             SELECT 1
             FROM reserva r
             WHERE r.espacio_id = e.id
               AND r.fecha = ?
               AND r.estado_reserva_id = 2
               AND r.hora_inicio < ?
               AND r.hora_fin > ?
           )
           THEN false
           ELSE true
         END AS disponible
       FROM espacio e
       ORDER BY e.nombre ASC`,
      [fecha, hora_fin, hora_inicio]
    );

    return res.status(HttpStatus.OK).json(espacios);
  } catch (error) {
    console.error('Error al obtener espacios:', error);

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error interno al obtener los espacios'
    });
  }
};

export const obtenerEspacioPorId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [rows]: any = await db.query(
      'SELECT * FROM espacio WHERE id = ?',
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: 'Espacio no encontrado'
      });
    }

    return res.status(HttpStatus.OK).json(rows[0]);
  } catch (error) {
    console.error('Error al obtener espacio:', error);

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error interno al obtener el espacio'
    });
  }
};

export const crearEspacio = async (req: Request, res: Response) => {
  try {
    const { nombre, capacidad } = req.body;

    if (!nombre) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'El nombre del espacio es obligatorio'
      });
    }

    if (capacidad !== undefined && capacidad <= 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'La capacidad debe ser mayor a 0'
      });
    }

    const [resultado]: any = await db.query(
      'INSERT INTO espacio (nombre, capacidad) VALUES (?, ?)',
      [nombre, capacidad ?? null]
    );

    return res.status(HttpStatus.CREATED).json({
      message: 'Espacio creado exitosamente',
      espacioId: resultado.insertId
    });
  } catch (error) {
    console.error('Error al crear espacio:', error);

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error interno al crear el espacio'
    });
  }
};

export const actualizarEspacio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, capacidad } = req.body;

    if (!nombre) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'El nombre del espacio es obligatorio'
      });
    }

    if (capacidad !== undefined && capacidad <= 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'La capacidad debe ser mayor a 0'
      });
    }

    const [rows]: any = await db.query(
      'SELECT id FROM espacio WHERE id = ?',
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: 'Espacio no encontrado'
      });
    }

    await db.query(
      'UPDATE espacio SET nombre = ?, capacidad = ? WHERE id = ?',
      [nombre, capacidad ?? null, id]
    );

    return res.status(HttpStatus.OK).json({
      message: 'Espacio actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar espacio:', error);

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error interno al actualizar el espacio'
    });
  }
};

export const eliminarEspacio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [rows]: any = await db.query(
      'SELECT id FROM espacio WHERE id = ?',
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: 'Espacio no encontrado'
      });
    }

    await db.query(
      'DELETE FROM espacio WHERE id = ?',
      [id]
    );

    return res.status(HttpStatus.OK).json({
      message: 'Espacio eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar espacio:', error);

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error interno al eliminar el espacio'
    });
  }
};