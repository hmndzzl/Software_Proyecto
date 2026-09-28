import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';
import pool from '../config/db';
import { ROLES } from '../config/roles';
import { HttpStatus } from '../utils/httpStatus';
import { ContactoCreado } from '../types/contacto.types';

const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function textoRequerido(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const limpio = value.trim();
  if (!limpio || limpio.length > maxLength) return null;
  return limpio;
}

// HU-32: formulario público de contacto de la landing page (sin autenticación).
export const crearContacto = async (req: Request, res: Response): Promise<void> => {
  const nombre = textoRequerido(req.body?.nombre, 255);
  const correo = textoRequerido(req.body?.correo, 255);
  const motivo = textoRequerido(req.body?.motivo, 255);
  const mensaje = textoRequerido(req.body?.mensaje, 5000);
  const telefonoBruto = req.body?.telefono;
  const telefono = typeof telefonoBruto === 'string' && telefonoBruto.trim() ? telefonoBruto.trim() : null;

  if (!nombre || !motivo || !mensaje) {
    res.status(HttpStatus.BAD_REQUEST).json({
      mensaje: 'Los campos nombre, motivo y mensaje son obligatorios (máximo 255, 255 y 5000 caracteres respectivamente)',
    });
    return;
  }
  if (!correo || !CORREO_REGEX.test(correo)) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'Ingresa un correo electrónico válido' });
    return;
  }
  if (telefonoBruto !== undefined && telefonoBruto !== null && typeof telefonoBruto !== 'string') {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'El teléfono debe ser texto' });
    return;
  }
  if (telefono && telefono.length > 50) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'El teléfono no puede superar los 50 caracteres' });
    return;
  }

  let conn: PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [destinatarios] = await conn.execute<RowDataPacket[]>(
      'SELECT id FROM persona WHERE rol_id IN (?, ?)', [ROLES.SACERDOTE, ROLES.ADMIN]
    );
    if (!destinatarios.length) {
      await conn.rollback();
      res.status(HttpStatus.CONFLICT).json({ mensaje: 'No hay sacerdotes ni administradores registrados para recibir el mensaje' });
      return;
    }

    const textoNotificacion = `Nuevo mensaje de contacto de ${nombre} (${correo}${telefono ? `, ${telefono}` : ''}).\nMotivo: ${motivo}\nMensaje: ${mensaje}`;
    const [notificacion] = await conn.execute<ResultSetHeader>(
      "INSERT INTO notificacion (mensaje, fecha, tipo) VALUES (?, CURDATE(), 'individual')",
      [textoNotificacion]
    );
    for (const destinatario of destinatarios) {
      await conn.execute('INSERT INTO persona_notificacion (persona_id, notificacion_id) VALUES (?, ?)',
        [destinatario.id, notificacion.insertId]);
    }

    const [resultado] = await conn.execute<ResultSetHeader>(
      'INSERT INTO mensaje_contacto (nombre, correo, telefono, motivo, mensaje, fecha, notificacion_id) VALUES (?, ?, ?, ?, ?, CURDATE(), ?)',
      [nombre, correo, telefono, motivo, mensaje, notificacion.insertId]
    );

    await conn.commit();

    const contacto: ContactoCreado = {
      id: resultado.insertId,
      nombre, correo, motivo, mensaje,
      telefono: telefono ?? undefined,
      fecha: new Date().toISOString().slice(0, 10),
      notificacion_id: notificacion.insertId,
    };
    res.status(HttpStatus.CREATED).json({ mensaje: 'Mensaje enviado; la oficina parroquial te contactará pronto', contacto });
  } catch (error) {
    if (conn) {
      try { await conn.rollback(); } catch (rollbackError) { console.error('Error al revertir mensaje de contacto:', rollbackError); }
    }
    console.error('Error en crearContacto:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al enviar el mensaje' });
  } finally {
    conn?.release();
  }
};
