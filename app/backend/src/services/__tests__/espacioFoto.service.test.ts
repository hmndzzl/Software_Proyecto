import { beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { guardarFotoEspacio, eliminarFotoEspacio } from '../espacioFoto.service';

vi.mock('node:fs/promises', () => ({ mkdir: vi.fn(), writeFile: vi.fn(), unlink: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
const archivo = (buffer: Buffer, mimetype = 'image/png') => ({ buffer, mimetype } as Express.Multer.File);

describe('imágenes de espacios', () => {
  it('genera WebP sin EXIF con tamaño acotado y nombre irrepetible', async () => {
    const buffer = await sharp({ create: { width: 2000, height: 1600, channels: 3, background: 'red' } })
      .withMetadata().png().toBuffer();
    const url = await guardarFotoEspacio(archivo(buffer));
    expect(url).toMatch(/^\/uploads\/espacios\/subidas\/[a-f0-9-]{36}\.webp$/);
    expect(mkdir).toHaveBeenCalled();
    const salida = vi.mocked(writeFile).mock.calls[0][1] as Buffer;
    const metadata = await sharp(salida).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBeLessThanOrEqual(1600);
    expect(metadata.height).toBeLessThanOrEqual(1200);
    expect(metadata.exif).toBeUndefined();
    expect(vi.mocked(writeFile).mock.calls[0][2]).toEqual({ flag: 'wx' });
  });
  it('rechaza contenido falso y un MIME distinto al contenido', async () => {
    await expect(guardarFotoEspacio(archivo(Buffer.from('<svg></svg>')))).rejects.toMatchObject({ status: 400 });
    const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: 'red' } }).png().toBuffer();
    await expect(guardarFotoEspacio(archivo(buffer, 'image/jpeg'))).rejects.toMatchObject({ status: 400 });
    expect(writeFile).not.toHaveBeenCalled();
  });
  it('nunca elimina fotos del despliegue ni rutas arbitrarias', async () => {
    for (const url of ['/uploads/espacios/salon-01-v1.webp', '/etc/passwd', '/uploads/espacios/subidas/../salon.webp', null]) {
      await eliminarFotoEspacio(url);
    }
    expect(unlink).not.toHaveBeenCalled();
    await eliminarFotoEspacio('/uploads/espacios/subidas/00000000-0000-0000-0000-000000000000.webp');
    expect(unlink).toHaveBeenCalledOnce();
  });
});
