import { beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { guardarImagenLanding, eliminarImagenLanding } from '../landingImagen.service';

vi.mock('node:fs/promises', () => ({ mkdir: vi.fn(), writeFile: vi.fn(), unlink: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
const archivo = (buffer: Buffer, mimetype = 'image/png') => ({ buffer, mimetype } as Express.Multer.File);

describe('imágenes de la landing', () => {
  it('genera WebP sin EXIF con tamaño acotado y nombre irrepetible', async () => {
    const buffer = await sharp({ create: { width: 2400, height: 1800, channels: 3, background: 'red' } })
      .withMetadata().png().toBuffer();
    const url = await guardarImagenLanding(archivo(buffer));
    expect(url).toMatch(/^\/uploads\/landing\/subidas\/[a-f0-9-]{36}\.webp$/);
    expect(mkdir).toHaveBeenCalledWith(expect.stringContaining('landing'), { recursive: true });
    const salida = vi.mocked(writeFile).mock.calls[0][1] as Buffer;
    const metadata = await sharp(salida).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBeLessThanOrEqual(1600);
    expect(metadata.height).toBeLessThanOrEqual(1200);
    expect(metadata.exif).toBeUndefined();
    expect(vi.mocked(writeFile).mock.calls[0][2]).toEqual({ flag: 'wx' });
  });

  it('rechaza contenido falso y un MIME distinto al contenido', async () => {
    await expect(guardarImagenLanding(archivo(Buffer.from('<svg></svg>')))).rejects.toMatchObject({ status: 400 });
    const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: 'red' } }).png().toBuffer();
    await expect(guardarImagenLanding(archivo(buffer, 'image/jpeg'))).rejects.toMatchObject({ status: 400 });
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('solo elimina fotos subidas desde el panel, nunca rutas arbitrarias ni las del despliegue', async () => {
    for (const url of ['/uploads/espacios/subidas/00000000-0000-0000-0000-000000000000.webp', '/etc/passwd',
      '/uploads/landing/subidas/../salon.webp', '/uploads/landing/fachada-v1.webp', '/uploads/landing/fecha-san-pedro-nolasco-v1.webp', '', null, undefined]) {
      await eliminarImagenLanding(url);
    }
    expect(unlink).not.toHaveBeenCalled();
    await eliminarImagenLanding('/uploads/landing/subidas/00000000-0000-0000-0000-000000000000.webp');
    expect(unlink).toHaveBeenCalledOnce();
  });

  it('ignora una foto que ya no existe y registra cualquier otro error sin interrumpir', async () => {
    const url = '/uploads/landing/subidas/00000000-0000-0000-0000-000000000000.webp';
    vi.mocked(unlink).mockRejectedValueOnce(Object.assign(new Error('no existe'), { code: 'ENOENT' }));
    await expect(eliminarImagenLanding(url)).resolves.toBeUndefined();
    const registro = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(unlink).mockRejectedValueOnce(Object.assign(new Error('sin permiso'), { code: 'EACCES' }));
    await expect(eliminarImagenLanding(url)).resolves.toBeUndefined();
    expect(registro).toHaveBeenCalledOnce();
  });
});
