import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';
import pool from '../config/db';
import { HttpStatus } from '../utils/httpStatus';
import { combinarContenidoLanding, validarCambiosLanding } from '../utils/landing';
import { ContenidoLanding } from '../types/landing.types';

interface LandingRow extends RowDataPacket { contenido: string | ContenidoLanding }
const leerContenido = (row: LandingRow): ContenidoLanding =>
  typeof row.contenido === 'string' ? JSON.parse(row.contenido) : row.contenido;

export const getContenidoLanding = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.execute<LandingRow[]>('SELECT contenido FROM contenido_landing WHERE id = 1');
    if (!rows.length) {
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Contenido de la landing no configurado' });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(HttpStatus.OK).json(leerContenido(rows[0]));
  } catch (error) {
    console.error('Error en getContenidoLanding:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al obtener el contenido de la landing' });
  }
};

export const actualizarContenidoLanding = async (req: Request, res: Response): Promise<void> => {
  let cambios;
  try {
    cambios = validarCambiosLanding(req.body);
  } catch (error) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: error instanceof Error ? error.message : 'Contenido inválido' });
    return;
  }
  let conn: PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    // Serializa las ediciones: un PATCH no pierde campos de otro PATCH concurrente.
    const [rows] = await conn.execute<LandingRow[]>('SELECT contenido FROM contenido_landing WHERE id = 1 FOR UPDATE');
    if (!rows.length) {
      await conn.rollback();
      res.status(HttpStatus.NOT_FOUND).json({ mensaje: 'Contenido de la landing no configurado' });
      return;
    }
    const contenido = combinarContenidoLanding(leerContenido(rows[0]), cambios);
    await conn.execute('UPDATE contenido_landing SET contenido = ? WHERE id = 1', [JSON.stringify(contenido)]);
    await conn.commit();
    res.setHeader('Cache-Control', 'no-store');
    res.status(HttpStatus.OK).json(contenido);
  } catch (error) {
    if (conn) {
      try { await conn.rollback(); } catch (rollbackError) { console.error('Error al revertir contenido de landing:', rollbackError); }
    }
    console.error('Error en actualizarContenidoLanding:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al actualizar el contenido de la landing' });
  } finally {
    conn?.release();
  }
};
