import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { ESTADOS_RESERVA } from '../config/estadosReserva';
import { HttpStatus } from '../utils/httpStatus';

interface EventoPublicoRow extends RowDataPacket {
  id: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  nombre_espacio: string | null;
}

export const getAgendaPublica = async (req: Request, res: Response): Promise<void> => {
  const { pagina = '1', limite = '100' } = req.query;
  if (typeof pagina !== 'string' || typeof limite !== 'string'
      || !/^[1-9]\d*$/.test(pagina) || !/^[1-9]\d*$/.test(limite)
      || !Number.isSafeInteger(Number(pagina)) || Number(limite) > 100
      || !Number.isSafeInteger((Number(pagina) - 1) * Number(limite))) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'pagina debe ser un entero positivo y limite un entero entre 1 y 100' });
    return;
  }

  try {
    const [rows] = await pool.execute<EventoPublicoRow[]>(
      `SELECT e.id, e.titulo, e.descripcion, r.fecha, r.hora_inicio, r.hora_fin,
              esp.nombre AS nombre_espacio
       FROM evento e
       JOIN reserva r ON r.id = e.reserva_id
       LEFT JOIN espacio esp ON esp.id = r.espacio_id
       WHERE e.publico = 1 AND r.estado_reserva_id = ?
         AND TIMESTAMP(r.fecha, r.hora_fin) > CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-06:00')
       ORDER BY r.fecha ASC, r.hora_inicio ASC, e.id ASC
       LIMIT ? OFFSET ?`,
      [ESTADOS_RESERVA.CONFIRMADA, Number(limite), (Number(pagina) - 1) * Number(limite)]
    );
    // Contrato público explícito: nunca devolver encargados, solicitantes ni sus datos personales.
    res.status(HttpStatus.OK).json(rows.map(({ id, titulo, descripcion, fecha, hora_inicio, hora_fin, nombre_espacio }) => ({
      id, titulo, descripcion, fecha, hora_inicio, hora_fin, nombre_espacio,
    })));
  } catch (error) {
    console.error('Error en getAgendaPublica:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al obtener la agenda pública' });
  }
};
