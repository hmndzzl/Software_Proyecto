import path from 'node:path';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

export const ESPACIOS_MEDIA_DIR = path.resolve(__dirname, '../../media/espacios');
export const ESPACIOS_SUBIDAS_DIR = path.join(ESPACIOS_MEDIA_DIR, 'subidas');
export class ErrorEspacio extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function guardarFotoEspacio(file: Express.Multer.File): Promise<string> {
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
    throw new ErrorEspacio(400, 'La imagen debe ser JPEG, PNG o WebP válida, sin animación y de hasta 40 megapíxeles');
  }
  await mkdir(ESPACIOS_SUBIDAS_DIR, { recursive: true });
  const nombre = `${randomUUID()}.webp`;
  await writeFile(path.join(ESPACIOS_SUBIDAS_DIR, nombre), imagen, { flag: 'wx' });
  return `/uploads/espacios/subidas/${nombre}`;
}

/** Nunca elimina las imágenes incluidas en el despliegue ni rutas proporcionadas por el cliente. */
export async function eliminarFotoEspacio(url: string | null | undefined): Promise<void> {
  if (!url || !/^\/uploads\/espacios\/subidas\/[a-f0-9-]{36}\.webp$/.test(url)) return;
  try { await unlink(path.join(ESPACIOS_SUBIDAS_DIR, path.basename(url))); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.error('No se pudo limpiar una imagen de espacio:', error);
  }
}
