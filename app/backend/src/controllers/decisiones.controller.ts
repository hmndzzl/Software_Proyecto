import type { Request, Response } from 'express';
import type { RowDataPacket } from 'mysql2';
import db from '../config/db';
import type { TipoDecision } from '../services/decisiones.service';

function listarDecisiones(tipo: TipoDecision) {
  return async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      res.status(400).json({ mensaje: 'Identificador inválido' });
      return;
    }
    try {
      const [registro] = await db.query<RowDataPacket[]>(`SELECT id FROM ${tipo === 'cuenta' ? 'persona' : 'reserva'} WHERE id = ?`, [id]);
      if (!registro.length) {
        res.status(404).json({ mensaje: 'Registro no encontrado' });
        return;
      }
      const [decisiones] = await db.query<RowDataPacket[]>(
        `SELECT id, resultado, actor_id, actor_nombre,
                DATE_FORMAT(fecha_utc, '%Y-%m-%dT%H:%i:%s.%fZ') AS fecha
         FROM ${tipo}_decision WHERE ${tipo}_id = ? ORDER BY fecha_utc DESC, id DESC`, [id],
      );
      res.json(decisiones);
    } catch (error) {
      console.error('Error al consultar decisiones:', error);
      res.status(500).json({ mensaje: 'No se pudo obtener el historial de decisiones' });
    }
  };
}

export const decisionesReserva = listarDecisiones('reserva');
export const decisionesCuenta = listarDecisiones('cuenta');
