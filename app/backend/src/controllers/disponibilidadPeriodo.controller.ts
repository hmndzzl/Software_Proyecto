import type { Request, Response } from 'express';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/db';
import { ROLES } from '../config/roles';
import { validarMinistrosPropios } from '../services/alcanceMinistros.service';
import { ErrorAsignacion } from '../services/asignacionError';

function fechaHora(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) || value < '1000-01-01T00:00') return false;
  const date = new Date(`${value}:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 16) === value;
}

export async function gestionarPeriodo(req: Request, res: Response) {
  const id = Number(req.params.id);
  const periodoId = Number(req.params.periodoId);
  if (!Number.isSafeInteger(id) || id <= 0 || (req.method === 'DELETE' && (!Number.isSafeInteger(periodoId) || periodoId <= 0))) {
    return res.status(400).json({ mensaje: 'Identificador inválido' });
  }
  const { desde, hasta } = req.body ?? {};
  if (req.method === 'POST' && (!fechaHora(desde) || !fechaHora(hasta) || desde >= hasta)) {
    return res.status(400).json({ mensaje: 'Envía desde y hasta como YYYY-MM-DDTHH:mm, con inicio anterior al fin' });
  }
  try {
    await validarMinistrosPropios(pool, req.user!, [id]);
    const [personas] = await pool.execute<RowDataPacket[]>('SELECT id FROM persona WHERE id = ? AND rol_id = ?', [id, ROLES.MINISTRO]);
    if (!personas.length) return res.status(404).json({ mensaje: 'Ministro no encontrado' });
    if (req.method === 'GET') {
      const [periodos] = await pool.execute<RowDataPacket[]>(
        `SELECT id, DATE_FORMAT(desde, '%Y-%m-%dT%H:%i') AS desde, DATE_FORMAT(hasta, '%Y-%m-%dT%H:%i') AS hasta, 'disponibilidad' AS origen
         FROM disponibilidad_periodo WHERE ministro_id = ?
         UNION ALL
         SELECT id, DATE_FORMAT(fecha_inicio, '%Y-%m-%dT00:00'), DATE_FORMAT(DATE_ADD(fecha_fin, INTERVAL 1 DAY), '%Y-%m-%dT00:00'), 'ausencia'
         FROM periodo_ausencia WHERE ministro_id = ? ORDER BY desde, id`, [id, id]);
      return res.json(periodos);
    }
    if (req.method === 'POST') {
      const [result] = await pool.execute<ResultSetHeader>(
        'INSERT INTO disponibilidad_periodo (ministro_id, desde, hasta) VALUES (?, ?, ?)',
        [id, desde.replace('T', ' '), hasta.replace('T', ' ')]);
      return res.status(201).json({ id: result.insertId, desde, hasta, origen: 'disponibilidad' });
    }
    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM disponibilidad_periodo WHERE id = ? AND ministro_id = ?', [periodoId, id]);
    return result.affectedRows ? res.status(204).send() : res.status(404).json({ mensaje: 'Periodo no encontrado' });
  } catch (error) {
    if (error instanceof ErrorAsignacion) return res.status(error.status).json({ mensaje: error.message });
    console.error('Error al gestionar periodos de disponibilidad:', error);
    return res.status(500).json({ mensaje: 'No se pudo gestionar el periodo' });
  }
}
