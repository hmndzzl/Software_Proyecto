import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { ESTADOS_RESERVA } from '../config/estadosReserva';
import { ROLES } from '../config/roles';
import { HttpStatus } from '../utils/httpStatus';
import { CHECKIN_ANTICIPACION_MIN } from '../config/constants';
import { AHORA_GUATEMALA_SQL } from '../utils/horaGuatemala';

import { withTransaction } from '../utils/withTransaction';
import { guardarFotoEspacio, eliminarFotoEspacio, ErrorEspacio } from '../services/espacioFoto.service';

interface EspacioRow extends RowDataPacket {
  id: number;
  nombre: string;
  capacidad: number | null;
  foto_url: string | null;
  disponible?: 0 | 1;
  en_uso?: 0 | 1;
}

interface ReservaCheckinRow extends RowDataPacket {
  id: number;
  hora_inicio: string;
  hora_fin: string;
  solicitante_id: number;
  solicitante_nombre: string;
  checkin_en: string | null;
}

// HU-15: estado real "en uso" (sin tolerancia) — solo cuenta si hubo check-in Y
// el instante actual (Guatemala) cae dentro del horario de esa reserva confirmada.
const EN_USO_SQL = `
  EXISTS (
    SELECT 1 FROM reserva r
    WHERE r.espacio_id = e.id
      AND r.estado_reserva_id = ?
      AND r.checkin_en IS NOT NULL
      AND r.fecha = DATE(${AHORA_GUATEMALA_SQL})
      AND TIME(${AHORA_GUATEMALA_SQL}) BETWEEN r.hora_inicio AND r.hora_fin
  ) AS en_uso
`;

const getQueryParam = (value: unknown) => (typeof value === 'string' ? value : '');

export const obtenerEspacios = async (req: Request, res: Response) => {
  try {
    const fecha = getQueryParam(req.query.fecha);
    const hora_inicio = getQueryParam(req.query.hora_inicio);
    const hora_fin = getQueryParam(req.query.hora_fin);

    const tieneUnParametro = fecha || hora_inicio || hora_fin;
    const tieneTodosLosParametros = fecha && hora_inicio && hora_fin;

    if (tieneUnParametro && !tieneTodosLosParametros) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Debe enviar fecha, hora_inicio y hora_fin para consultar disponibilidad'
      });
    }

    // comportamiento actual si no vienen params, mas el estado "en uso" (HU-15)
    if (!tieneTodosLosParametros) {
      const [espacios] = await pool.execute<EspacioRow[]>(
        `SELECT e.*, ${EN_USO_SQL} FROM espacio e ORDER BY e.nombre ASC`,
        [ESTADOS_RESERVA.CONFIRMADA]
      );

      return res.status(HttpStatus.OK).json(
        espacios.map((espacio) => ({ ...espacio, en_uso: Boolean(espacio.en_uso) }))
      );
    }

    if (hora_inicio >= hora_fin) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'La hora de inicio debe ser menor que la hora de fin'
      });
    }

    const [espacios] = await pool.execute<EspacioRow[]>(
      `SELECT
         e.id,
         e.nombre,
         e.capacidad,
         e.foto_url,
         CASE
           WHEN EXISTS (
             SELECT 1
             FROM reserva r
             WHERE r.espacio_id = e.id
               AND r.fecha = ?
               AND r.estado_reserva_id = ?
               AND r.hora_inicio < ?
               AND r.hora_fin > ?
           )
           THEN false
           ELSE true
         END AS disponible,
         ${EN_USO_SQL}
       FROM espacio e
       ORDER BY e.nombre ASC`,
      [fecha, ESTADOS_RESERVA.CONFIRMADA, hora_fin, hora_inicio, ESTADOS_RESERVA.CONFIRMADA]
    );

    return res.status(HttpStatus.OK).json(
      espacios.map((espacio) => ({
        ...espacio,
        disponible: Boolean(espacio.disponible),
        en_uso: Boolean(espacio.en_uso)
      }))
    );
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

    const [rows] = await pool.execute<EspacioRow[]>(
      `SELECT e.*, ${EN_USO_SQL} FROM espacio e WHERE e.id = ?`,
      [ESTADOS_RESERVA.CONFIRMADA, id]
    );

    if (!rows || rows.length === 0) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: 'Espacio no encontrado'
      });
    }

    // HU-15: reservas confirmadas de hoy, de este espacio, dentro de la ventana de
    // check-in (con tolerancia de CHECKIN_ANTICIPACION_MIN). Para roles no privilegiados
    // solo se expone la propia; Admin/Sacerdote ven cualquiera (puede haber más de una:
    // la activa ahora y la próxima por iniciar dentro de la tolerancia).
    const esPrivilegiado = req.user!.rol_id === ROLES.ADMIN || req.user!.rol_id === ROLES.SACERDOTE;
    const anticipacion = `00:${String(CHECKIN_ANTICIPACION_MIN).padStart(2, '0')}:00`;
    const params: any[] = [id, ESTADOS_RESERVA.CONFIRMADA, anticipacion];
    if (!esPrivilegiado) {
      params.push(req.user!.id);
    }

    const [reservasCheckin] = await pool.execute<ReservaCheckinRow[]>(
      `SELECT r.id, r.hora_inicio, r.hora_fin, r.solicitante_id, p.nombre AS solicitante_nombre,
              DATE_FORMAT(r.checkin_en, '%Y-%m-%d %H:%i:%s') AS checkin_en
       FROM reserva r
       JOIN persona p ON p.id = r.solicitante_id
       WHERE r.espacio_id = ?
         AND r.estado_reserva_id = ?
         AND r.fecha = DATE(${AHORA_GUATEMALA_SQL})
         AND r.hora_fin > TIME(${AHORA_GUATEMALA_SQL})
         AND SUBTIME(r.hora_inicio, ?) <= TIME(${AHORA_GUATEMALA_SQL})
         ${esPrivilegiado ? '' : 'AND r.solicitante_id = ?'}
       ORDER BY r.hora_inicio ASC`,
      params
    );

    return res.status(HttpStatus.OK).json({
      ...rows[0],
      en_uso: Boolean(rows[0].en_uso),
      reservas_checkin_disponible: reservasCheckin
    });
  } catch (error) {
    console.error('Error al obtener espacio:', error);

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error interno al obtener el espacio'
    });
  }
};

function validarDatosEspacio(body: Record<string, unknown>) {
  if (typeof body.nombre !== 'string' || !body.nombre.trim()) {
    throw new ErrorEspacio(400, 'El nombre del espacio es obligatorio');
  }
  const nombre = body.nombre.trim();
  if (nombre.length > 100) throw new ErrorEspacio(400, 'El nombre no puede superar 100 caracteres');
  const valor = body.capacidad;
  const capacidad = valor === undefined || valor === null || valor === '' ? null :
    (typeof valor === 'number' || (typeof valor === 'string' && /^\d+$/.test(valor)) ? Number(valor) : NaN);
  if (capacidad !== null && (!Number.isSafeInteger(capacidad) || capacidad < 1 || capacidad > 2147483647)) {
    throw new ErrorEspacio(400, 'La capacidad debe ser un número entero mayor que cero');
  }
  if (body.quitar_imagen !== undefined && ![true, false, 'true', 'false'].includes(body.quitar_imagen as boolean | string)) {
    throw new ErrorEspacio(400, 'quitar_imagen debe ser un booleano');
  }
  return { nombre, capacidad, quitarImagen: body.quitar_imagen === true || body.quitar_imagen === 'true' };
}

function validarId(id: string) {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) throw new ErrorEspacio(400, 'El identificador del espacio no es válido');
}

export const crearEspacio = async (req: Request, res: Response) => {
  let fotoNueva: string | null = null;
  try {
    const { nombre, capacidad, quitarImagen } = validarDatosEspacio(req.body);
    if (req.file && quitarImagen) throw new ErrorEspacio(400, 'Elige subir o quitar la imagen');
    if (req.file) fotoNueva = await guardarFotoEspacio(req.file);
    const [resultado] = await pool.execute<ResultSetHeader>(
      'INSERT INTO espacio (nombre, capacidad, foto_url) VALUES (?, ?, ?)', [nombre, capacidad, fotoNueva],
    );
    return res.status(HttpStatus.CREATED).json({ message: 'Espacio creado exitosamente', espacioId: resultado.insertId });
  } catch (error) {
    await eliminarFotoEspacio(fotoNueva);
    if (error instanceof ErrorEspacio) return res.status(error.status).json({ message: error.message });
    console.error('Error al crear espacio:', error);
    return res.status(500).json({ message: 'Error interno al crear el espacio' });
  }
};

export const actualizarEspacio = async (req: Request, res: Response) => {
  let fotoNueva: string | null = null;
  let fotoAnterior: string | null = null;
  try {
    validarId(req.params.id);
    const { nombre, capacidad, quitarImagen } = validarDatosEspacio(req.body);
    if (req.file && quitarImagen) throw new ErrorEspacio(400, 'Elige subir o quitar la imagen');
    if (req.file) fotoNueva = await guardarFotoEspacio(req.file);
    await withTransaction(async conn => {
      const [rows] = await conn.execute<EspacioRow[]>('SELECT * FROM espacio WHERE id = ? FOR UPDATE', [req.params.id]);
      if (!rows.length) throw new ErrorEspacio(404, 'Espacio no encontrado');
      const foto = quitarImagen ? null : fotoNueva ?? rows[0].foto_url;
      await conn.execute('UPDATE espacio SET nombre = ?, capacidad = ?, foto_url = ? WHERE id = ?',
        [nombre, capacidad, foto, req.params.id]);
      if (quitarImagen || fotoNueva) fotoAnterior = rows[0].foto_url;
      return 'commit';
    });
    await eliminarFotoEspacio(fotoAnterior);
    return res.status(200).json({ message: 'Espacio actualizado exitosamente' });
  } catch (error) {
    await eliminarFotoEspacio(fotoNueva);
    if (error instanceof ErrorEspacio) return res.status(error.status).json({ message: error.message });
    console.error('Error al actualizar espacio:', error);
    return res.status(500).json({ message: 'Error interno al actualizar el espacio' });
  }
};

export const eliminarEspacio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute<EspacioRow[]>(
      'SELECT id FROM espacio WHERE id = ?',
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: 'Espacio no encontrado'
      });
    }

    await pool.execute(
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
