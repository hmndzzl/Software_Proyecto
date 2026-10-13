import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { ROLES } from '../config/roles';
import { HttpStatus } from '../utils/httpStatus';
import { ContactoCreado } from '../types/contacto.types';
import { withTransaction } from '../utils/withTransaction';

const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Formato genérico tipo E.164 (+código de país y número, sin espacios ni símbolos).
// Deliberadamente no se ata a +502: el prefijo de país lo decide el frontend.
const TELEFONO_REGEX = /^\+\d{8,15}$/;

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
  if (telefono && !TELEFONO_REGEX.test(telefono)) {
    res.status(HttpStatus.BAD_REQUEST).json({ mensaje: 'El teléfono debe incluir código de país, ej. +50255551234' });
    return;
  }

  try {
    let contacto: ContactoCreado | null = null;

    await withTransaction(async (conn) => {
      const [destinatarios] = await conn.execute<RowDataPacket[]>(
        'SELECT id FROM persona WHERE rol_id IN (?, ?)', [ROLES.SACERDOTE, ROLES.ADMIN]
      );
      if (!destinatarios.length) return 'rollback';

      const textoNotificacion = [
        'Nuevo mensaje de contacto de la página web:',
        `Nombre: ${nombre}`,
        `Correo: ${correo}`,
        `Teléfono: ${telefono ?? 'No proporcionado'}`,
        `Motivo: ${motivo}`,
        `Mensaje: ${mensaje}`,
      ].join('\n');
      const [notificacion] = await conn.execute<ResultSetHeader>(
        "INSERT INTO notificacion (mensaje, fecha, tipo) VALUES (?, CURDATE(), 'individual')",
        [textoNotificacion]
      );
      for (const destinatario of destinatarios) {
        await conn.execute('INSERT INTO persona_notificacion (persona_id, notificacion_id, leida) VALUES (?, ?, 0)',
          [destinatario.id, notificacion.insertId]);
      }

      const [resultado] = await conn.execute<ResultSetHeader>(
        'INSERT INTO mensaje_contacto (nombre, correo, telefono, motivo, mensaje, fecha, notificacion_id) VALUES (?, ?, ?, ?, ?, CURDATE(), ?)',
        [nombre, correo, telefono, motivo, mensaje, notificacion.insertId]
      );

      contacto = {
        id: resultado.insertId,
        nombre, correo, motivo, mensaje,
        telefono: telefono ?? undefined,
        fecha: new Date().toISOString().slice(0, 10),
        notificacion_id: notificacion.insertId,
      };
      return 'commit';
    });

    if (!contacto) {
      res.status(HttpStatus.CONFLICT).json({ mensaje: 'No hay sacerdotes ni administradores registrados para recibir el mensaje' });
      return;
    }

    // Un 201 se responde únicamente después del commit: el mensaje y sus
    // notificaciones ya son visibles para cualquier conexión a la base de datos.
    res.status(HttpStatus.CREATED).json({ mensaje: 'Mensaje enviado; la oficina parroquial te contactará pronto', contacto });
  } catch (error) {
    console.error('Error en crearContacto:', error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: 'Error al enviar el mensaje' });
  }
};
