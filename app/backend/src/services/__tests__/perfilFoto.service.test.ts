import { beforeEach, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { writeFile, unlink } from 'node:fs/promises';
import { guardarFotoPerfil, eliminarFotoPerfil } from '../perfilFoto.service';
vi.mock('node:fs/promises', () => ({ mkdir: vi.fn(), writeFile: vi.fn(), unlink: vi.fn() }));
const archivo = (buffer: Buffer, mimetype = 'image/png') => ({ buffer, mimetype } as Express.Multer.File);
beforeEach(() => vi.resetAllMocks());
it('guarda un avatar WebP cuadrado de 512px sin EXIF, con nombre generado', async () => {
  const buffer = await sharp({ create: { width: 900, height: 600, channels: 3, background: 'red' } }).withMetadata().png().toBuffer();
  expect(await guardarFotoPerfil(archivo(buffer))).toMatch(/^\/uploads\/perfiles\/subidas\/[a-f0-9-]{36}\.webp$/);
  const metadata = await sharp(vi.mocked(writeFile).mock.calls[0][1] as Buffer).metadata();
  expect(metadata).toMatchObject({ format: 'webp', width: 512, height: 512 });
  expect(metadata.exif).toBeUndefined();
});
it('rechaza archivos falsos o cuyo MIME no corresponde con sus bytes', async () => {
  await expect(guardarFotoPerfil(archivo(Buffer.from('no es una foto')))).rejects.toMatchObject({ status: 400 });
  const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: 'red' } }).png().toBuffer();
  await expect(guardarFotoPerfil(archivo(png, 'image/jpeg'))).rejects.toMatchObject({ status: 400 });
  expect(writeFile).not.toHaveBeenCalled();
});
it('limpia solo URLs propias y tolera archivos inexistentes', async () => {
  for (const url of [null, '/etc/passwd', '/uploads/perfiles/subidas/../archivo.webp']) await eliminarFotoPerfil(url);
  expect(unlink).not.toHaveBeenCalled();
  vi.mocked(unlink).mockRejectedValueOnce(Object.assign(new Error(), { code: 'ENOENT' }));
  await eliminarFotoPerfil('/uploads/perfiles/subidas/00000000-0000-0000-0000-000000000001.webp');
  expect(unlink).toHaveBeenCalledOnce();
});
