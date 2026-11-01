import path from 'node:path';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

export const PERFILES_MEDIA_DIR = path.resolve(__dirname, '../../media/perfiles');
const subidas = path.join(PERFILES_MEDIA_DIR, 'subidas');
export class ErrorFotoPerfil extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function guardarFotoPerfil(file: Express.Multer.File): Promise<string> {
  let imagen: Buffer;
  try {
    const proceso = sharp(file.buffer, { limitInputPixels: 40_000_000, failOn: 'warning' });
    const metadata = await proceso.metadata();
    const formatos: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    if (!metadata.format || formatos[metadata.format] !== file.mimetype || (metadata.pages ?? 1) > 1) throw new Error('Formato no admitido');
    // Se publica solo la versión optimizada, sin metadatos del original.
    imagen = await proceso.rotate().resize(512, 512, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
  } catch {
    throw new ErrorFotoPerfil(400, 'Selecciona una imagen JPEG, PNG o WebP válida, sin animación y de hasta 40 megapíxeles');
  }
  await mkdir(subidas, { recursive: true });
  const nombre = `${randomUUID()}.webp`;
  await writeFile(path.join(subidas, nombre), imagen, { flag: 'wx' });
  return `/uploads/perfiles/subidas/${nombre}`;
}

export async function eliminarFotoPerfil(url: string | null): Promise<void> {
  if (!url || !/^\/uploads\/perfiles\/subidas\/[a-f0-9-]{36}\.webp$/.test(url)) return;
  try { await unlink(path.join(subidas, path.basename(url))); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.error('No se pudo limpiar una foto de perfil:', error);
  }
}
