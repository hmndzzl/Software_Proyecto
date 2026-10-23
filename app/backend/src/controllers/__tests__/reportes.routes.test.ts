import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { strFromU8, unzipSync } from 'fflate';
import pool from '../../config/db';
import { app } from '../../app';
import { JWT_SECRET } from '../../config/env';
import { ROLES } from '../../config/roles';

vi.mock('../../config/db', () => ({ default: { execute: vi.fn() }, checkDbConnection: vi.fn() }));

const rutaReservas = '/api/reportes/reservas?desde=2026-10-01&hasta=2026-10-31&formato=csv';
const rutaTareas = '/api/reportes/tareas?desde=2026-10-05&hasta=2026-10-11&formato=csv';

function token(rol_id: number, id = 7) {
  return `Bearer ${jwt.sign({ id, rol_id }, JWT_SECRET)}`;
}

function cuentaActiva(rol_id: number) {
  vi.mocked(pool.execute).mockResolvedValueOnce([[{ rol_id, estado_cuenta: 'activa' }]] as never);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('exportación protegida de reportes', () => {
  it.each([rutaReservas, rutaTareas])('exige autenticación para %s', async (ruta) => {
    await request(app).get(ruta).expect(401);
    expect(pool.execute).not.toHaveBeenCalled();
  });

  it.each([ROLES.MINISTRO, ROLES.COORDINADOR_GRUPOS])('impide ambos reportes al rol %s', async (rol) => {
    cuentaActiva(rol);
    await request(app).get(rutaReservas).set('Authorization', token(rol)).expect(403);
    cuentaActiva(rol);
    await request(app).get(rutaTareas).set('Authorization', token(rol)).expect(403);
    expect(pool.execute).toHaveBeenCalledTimes(2);
  });

  it('impide reservas al coordinador de ministros, pero le permite tareas', async () => {
    cuentaActiva(ROLES.COORDINADOR_MINISTROS);
    await request(app).get(rutaReservas).set('Authorization', token(ROLES.COORDINADOR_MINISTROS)).expect(403);
    cuentaActiva(ROLES.COORDINADOR_MINISTROS);
    vi.mocked(pool.execute).mockResolvedValueOnce([[]] as never);
    const respuesta = await request(app).get(rutaTareas).set('Authorization', token(ROLES.COORDINADOR_MINISTROS)).expect(200);
    expect(respuesta.headers['content-type']).toMatch(/text\/csv/);
    expect(respuesta.text).toContain('Asignado a');
  });

  it.each([ROLES.SACERDOTE, ROLES.ADMIN])('permite ambos reportes al rol %s', async (rol) => {
    cuentaActiva(rol);
    vi.mocked(pool.execute).mockResolvedValueOnce([[]] as never);
    await request(app).get(rutaReservas).set('Authorization', token(rol)).expect(200);
    cuentaActiva(rol);
    vi.mocked(pool.execute).mockResolvedValueOnce([[]] as never);
    await request(app).get(rutaTareas).set('Authorization', token(rol)).expect(200);
  });

  it('rechaza un token con rol anterior si la cuenta cambió de rol o fue desactivada', async () => {
    cuentaActiva(ROLES.MINISTRO);
    await request(app).get(rutaReservas).set('Authorization', token(ROLES.ADMIN)).expect(403);
    vi.mocked(pool.execute).mockResolvedValueOnce([[{ rol_id: ROLES.ADMIN, estado_cuenta: 'rechazada' }]] as never);
    await request(app).get(rutaReservas).set('Authorization', token(ROLES.ADMIN)).expect(403);
    expect(pool.execute).toHaveBeenCalledTimes(2);
  });

  it.each([
    'desde=2026-02-30&hasta=2026-03-01&formato=csv',
    'desde=2026-10-31&hasta=2026-10-01&formato=csv',
    'desde=2026-10-01&hasta=2027-11-01&formato=csv',
    'desde=2026-10-01&hasta=2026-10-31&formato=ods',
    'desde=2026-10-01&hasta=2026-10-31&formato=csv&formato=pdf',
  ])('rechaza parámetros inválidos: %s', async (query) => {
    cuentaActiva(ROLES.ADMIN);
    await request(app).get(`/api/reportes/reservas?${query}`).set('Authorization', token(ROLES.ADMIN)).expect(400);
    expect(pool.execute).toHaveBeenCalledTimes(1);
  });

  it('rechaza tareas fuera de un mes y demasiadas filas', async () => {
    cuentaActiva(ROLES.ADMIN);
    await request(app).get('/api/reportes/tareas?desde=2026-10-01&hasta=2026-11-01&formato=csv')
      .set('Authorization', token(ROLES.ADMIN)).expect(400);
    cuentaActiva(ROLES.ADMIN);
    vi.mocked(pool.execute).mockResolvedValueOnce([Array.from({ length: 1001 }, () => ({}))] as never);
    await request(app).get(rutaTareas).set('Authorization', token(ROLES.ADMIN)).expect(413);
  });

  it('exporta solo campos de reservas autorizados y neutraliza fórmulas CSV', async () => {
    cuentaActiva(ROLES.ADMIN);
    vi.mocked(pool.execute).mockResolvedValueOnce([[{
      id: 8, fecha: '2026-10-07', hora_inicio: '08:00:00', hora_fin: '09:00:00',
      espacio: 'Salón 1', evento: '=HYPERLINK("https://malicioso.test")',
      estado: 'Confirmada', solicitante: 'Ana', password: 'nunca-exportar',
    }]] as never);
    const respuesta = await request(app).get(rutaReservas).set('Authorization', token(ROLES.ADMIN)).expect(200);
    expect(respuesta.headers['content-disposition']).toContain('attachment;');
    expect(respuesta.headers['cache-control']).toContain('no-store');
    expect(respuesta.text).toContain('"\t=HYPERLINK');
    expect(respuesta.text).not.toContain('nunca-exportar');
    expect(vi.mocked(pool.execute).mock.calls[1][1]).toEqual(['2026-10-01', '2026-10-31', 1001]);
  });

  it('exporta tareas sin asignación y con asignaciones en CSV', async () => {
    cuentaActiva(ROLES.COORDINADOR_MINISTROS);
    vi.mocked(pool.execute).mockResolvedValueOnce([[{
      id: 2, fecha: '2026-10-07', hora_inicio: '08:00:00', hora_fin: '09:00:00', titulo: 'Preparar altar', asignado: null,
    }, {
      id: 3, fecha: '2026-10-07', hora_inicio: '10:00:00', hora_fin: '11:00:00', titulo: 'Lectura', asignado: 'Juan',
    }]] as never);
    const respuesta = await request(app).get(rutaTareas).set('Authorization', token(ROLES.COORDINADOR_MINISTROS)).expect(200);
    expect(respuesta.text).toContain('Sin asignar');
    expect(respuesta.text).toContain('Juan');
    expect(respuesta.text).not.toContain('undefined');
  });

  it('genera un PDF descargable válido', async () => {
    cuentaActiva(ROLES.SACERDOTE);
    vi.mocked(pool.execute).mockResolvedValueOnce([[]] as never);
    const respuesta = await request(app)
      .get(rutaReservas.replace('formato=csv', 'formato=pdf'))
      .set('Authorization', token(ROLES.SACERDOTE))
      .buffer(true)
      .parse((res, done) => {
        const partes: Buffer[] = [];
        res.on('data', (parte) => partes.push(parte));
        res.on('end', () => done(null, Buffer.concat(partes)));
      })
      .expect(200);
    expect(respuesta.headers['content-type']).toMatch(/application\/pdf/);
    expect(respuesta.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  it.each([
    ['reservas', rutaReservas, ROLES.ADMIN],
    ['tareas', rutaTareas, ROLES.COORDINADOR_MINISTROS],
  ] as const)('genera un Excel descargable de %s', async (tipo, ruta, rol) => {
    cuentaActiva(rol);
    vi.mocked(pool.execute).mockResolvedValueOnce([[]] as never);
    const respuesta = await request(app)
      .get(ruta.replace('formato=csv', 'formato=xlsx'))
      .set('Authorization', token(rol))
      .buffer(true)
      .parse((res, done) => {
        const partes: Buffer[] = [];
        res.on('data', (parte) => partes.push(parte));
        res.on('end', () => done(null, Buffer.concat(partes)));
      })
      .expect(200);
    expect(respuesta.headers['content-type']).toMatch(/application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);
    expect(respuesta.headers['content-disposition']).toContain(`reporte-${tipo}-`);
    expect(respuesta.headers['content-disposition']).toContain('.xlsx');
    expect(respuesta.headers['cache-control']).toContain('no-store');
    expect(respuesta.body.subarray(0, 2).toString()).toBe('PK');
  });

  it('exporta Excel con columnas permitidas y conserva texto peligroso sin fórmulas', async () => {
    cuentaActiva(ROLES.ADMIN);
    vi.mocked(pool.execute).mockResolvedValueOnce([[{
      id: 8, fecha: '2026-10-07', hora_inicio: '08:00:00', hora_fin: '09:00:00',
      espacio: 'Salón 1', evento: '=HYPERLINK("https://malicioso.test")',
      estado: 'Confirmada', solicitante: 'Ana', password: 'nunca-exportar',
    }]] as never);
    const respuesta = await request(app)
      .get(rutaReservas.replace('formato=csv', 'formato=xlsx'))
      .set('Authorization', token(ROLES.ADMIN))
      .buffer(true)
      .parse((res, done) => {
        const partes: Buffer[] = [];
        res.on('data', (parte) => partes.push(parte));
        res.on('end', () => done(null, Buffer.concat(partes)));
      })
      .expect(200);
    const archivos = unzipSync(new Uint8Array(respuesta.body));
    const hoja = strFromU8(archivos['xl/worksheets/sheet1.xml']);
    const contenido = Object.values(archivos).map((archivo) => strFromU8(archivo)).join('\n');
    expect(contenido).toContain('HYPERLINK');
    expect(contenido).toContain('Salón');
    expect(contenido).not.toContain('nunca-exportar');
    expect(hoja).toMatch(/<c r="F2"[^>]* t="s"><v>\d+<\/v><\/c>/);
    expect(strFromU8(archivos['xl/sharedStrings.xml'])).toContain('=HYPERLINK');
    expect(hoja).not.toMatch(/<f(?:\s|>)/);
    expect(hoja).toContain('ySplit="1"');
  });

  it('bloquea Excel al ministro antes de consultar datos del reporte', async () => {
    cuentaActiva(ROLES.MINISTRO);
    await request(app)
      .get(rutaTareas.replace('formato=csv', 'formato=xlsx'))
      .set('Authorization', token(ROLES.MINISTRO))
      .expect(403);
    expect(pool.execute).toHaveBeenCalledTimes(1);
  });

  it('limita las solicitudes repetidas por cuenta', async () => {
    vi.mocked(pool.execute).mockResolvedValue([[{ rol_id: ROLES.MINISTRO, estado_cuenta: 'activa' }]] as never);
    for (let i = 0; i < 60; i += 1) {
      await request(app).get(rutaReservas).set('Authorization', token(ROLES.MINISTRO, 99)).expect(403);
    }
    await request(app).get(rutaReservas).set('Authorization', token(ROLES.MINISTRO, 99)).expect(429);
  });
});
