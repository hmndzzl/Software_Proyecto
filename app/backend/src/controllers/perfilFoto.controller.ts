import type { RequestHandler } from 'express';
import type { RowDataPacket } from 'mysql2';
import { withTransaction } from '../utils/withTransaction';
import { guardarFotoPerfil, eliminarFotoPerfil, ErrorFotoPerfil } from '../services/perfilFoto.service';

// La autorización se ejecuta antes de recibir el archivo en memoria.
export const soloFotoPropia: RequestHandler = (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) { res.status(400).json({ mensaje: 'Identificador inválido' }); return; }
  if (req.user!.id !== id) { res.status(403).json({ mensaje: 'Solo puedes cambiar tu propia foto de perfil' }); return; }
  next();
};

export const actualizarFotoPerfil: RequestHandler = async (req, res) => {
  if (!req.file) { res.status(400).json({ mensaje: 'Selecciona una foto de perfil' }); return; }
  let nueva: string | null = null;
  let anterior: string | null = null;
  try {
    nueva = await guardarFotoPerfil(req.file);
    await withTransaction(async conn => {
      const [rows] = await conn.execute<RowDataPacket[]>('SELECT foto_url FROM persona WHERE id = ? FOR UPDATE', [req.user!.id]);
      if (!rows.length) throw new ErrorFotoPerfil(404, 'Persona no encontrada');
      anterior = rows[0].foto_url ?? null;
      await conn.execute('UPDATE persona SET foto_url = ? WHERE id = ?', [nueva, req.user!.id]);
      return 'commit';
    });
  } catch (error) {
    // Si falla la BD, se conserva la foto anterior y no quedan archivos nuevos huérfanos.
    await eliminarFotoPerfil(nueva);
    if (error instanceof ErrorFotoPerfil) { res.status(error.status).json({ mensaje: error.message }); return; }
    console.error('Error al actualizar foto de perfil:', error);
    res.status(500).json({ mensaje: 'No se pudo guardar la foto de perfil. Intenta nuevamente.' });
    return;
  }
  await eliminarFotoPerfil(anterior);
  res.status(200).json({ foto_url: nueva });
};
