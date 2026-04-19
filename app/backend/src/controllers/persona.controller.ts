import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { HttpStatus } from '../utils/httpStatus';

export const getCoordinadoresGrupo = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.id, p.nombre
       FROM persona p
       WHERE p.rol_id = 3
       ORDER BY p.nombre ASC`
    );
    res.status(HttpStatus.OK).json(rows);
  } catch (error) {
    console.error('Error en getCoordinadoresGrupo:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      mensaje: 'Error al obtener los coordinadores de grupo',
    });
  }
};

export const getMinistros = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.id, p.nombre, p.correo
       FROM persona p
       INNER JOIN rol r ON r.id = p.rol_id
       WHERE LOWER(TRIM(r.detalle)) = 'ministro'
       ORDER BY p.nombre ASC`
    );

    res.status(HttpStatus.OK).json(rows);
  } catch (error) {
    console.error('Error en getMinistros:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      mensaje: 'Error al obtener los ministros',
    });
  }
};