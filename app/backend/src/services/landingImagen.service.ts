import path from 'node:path';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { URL_SUBIDA_LANDING } from '../types/landing.types';

export const LANDING_MEDIA_DIR = path.resolve(__dirname, '../../media/landing');
export const LANDING_SUBIDAS_DIR = path.join(LANDING_MEDIA_DIR, 'subidas');

export class ErrorImagenLanding extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function guardarImagenLanding(file: Express.Multer.File): Promise<string> {
  let imagen: Buffer;
  try {
    const proceso = sharp(file.buffer, { limitInputPixels: 40_000_000, failOn: 'warning' });
    const metadata = await proceso.metadata();
    const formatos: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    if (!metadata.format || formatos[metadata.format] !== file.mimetype || (metadata.pages ?? 1) > 1) {
      throw new Error('Formato no admitido');
    }
    // La recodificación descarta metadatos y nunca publica el archivo original.
    imagen = await proceso.rotate().resize(1600, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 }).toBuffer();
  } catch {
    throw new ErrorImagenLanding(400, 'La imagen debe ser JPEG, PNG o WebP válida, sin animación y de hasta 40 megapíxeles');
  }
  await mkdir(LANDING_SUBIDAS_DIR, { recursive: true });
  const nombre = `${randomUUID()}.webp`;
  await writeFile(path.join(LANDING_SUBIDAS_DIR, nombre), imagen, { flag: 'wx' });
  return `/uploads/landing/subidas/${nombre}`;
}

/** Solo elimina archivos subidos desde el panel: nunca las fotos del despliegue ni rutas proporcionadas por el cliente. */
export async function eliminarImagenLanding(url: string | null | undefined): Promise<void> {
  if (!url || !URL_SUBIDA_LANDING.test(url)) return;
  try { await unlink(path.join(LANDING_SUBIDAS_DIR, path.basename(url))); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.error('No se pudo limpiar una imagen de la landing:', error);
  }
}
