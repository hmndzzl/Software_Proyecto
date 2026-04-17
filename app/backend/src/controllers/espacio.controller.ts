import { Request, Response } from 'express';
import db from '../config/db';

export const obtenerEspacios = async (_req: Request, res: Response) => {
  try {
    const [espacios]: any = await db.query(
      'SELECT * FROM espacio ORDER BY nombre ASC'
    );
    return res.status(200).json(espacios);
  } catch (error) {
    console.error('Error al obtener espacios:', error);
    return res.status(500).json({ message: 'Error interno al obtener los espacios' });
  }
};

export const obtenerEspacioPorId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [rows]: any = await db.query('SELECT * FROM espacio WHERE id = ?', [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Espacio no encontrado' });
    }
    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error al obtener espacio:', error);
    return res.status(500).json({ message: 'Error interno al obtener el espacio' });
  }
};

export const crearEspacio = async (req: Request, res: Response) => {
  try {
    const { nombre, capacidad } = req.body;

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre del espacio es obligatorio' });
    }
    if (capacidad !== undefined && capacidad <= 0) {
      return res.status(400).json({ message: 'La capacidad debe ser mayor a 0' });
    }

    const [resultado]: any = await db.query(
      'INSERT INTO espacio (nombre, capacidad) VALUES (?, ?)',
      [nombre, capacidad ?? null]
    );
    return res.status(201).json({ message: 'Espacio creado exitosamente', espacioId: resultado.insertId });
  } catch (error) {
    console.error('Error al crear espacio:', error);
    return res.status(500).json({ message: 'Error interno al crear el espacio' });
  }
};

export const actualizarEspacio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, capacidad } = req.body;

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre del espacio es obligatorio' });
    }
    if (capacidad !== undefined && capacidad <= 0) {
      return res.status(400).json({ message: 'La capacidad debe ser mayor a 0' });
    }

    const [rows]: any = await db.query('SELECT id FROM espacio WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Espacio no encontrado' });
    }

    await db.query(
      'UPDATE espacio SET nombre = ?, capacidad = ? WHERE id = ?',
      [nombre, capacidad ?? null, id]
    );
    return res.status(200).json({ message: 'Espacio actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar espacio:', error);
    return res.status(500).json({ message: 'Error interno al actualizar el espacio' });
  }
};

export const eliminarEspacio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [rows]: any = await db.query('SELECT id FROM espacio WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Espacio no encontrado' });
    }

    await db.query('DELETE FROM espacio WHERE id = ?', [id]);
    return res.status(200).json({ message: 'Espacio eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar espacio:', error);
    return res.status(500).json({ message: 'Error interno al eliminar el espacio' });
  }
};