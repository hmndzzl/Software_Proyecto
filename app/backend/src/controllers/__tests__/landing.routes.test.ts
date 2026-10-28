import { obtenerPersonaSesion } from '../../services/sesion.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import pool from '../../config/db';
import { app } from '../../app';
import { JWT_SECRET } from '../../config/env';
import { ROLES } from '../../config/roles';
import { eliminarImagenLanding, ErrorImagenLanding, guardarImagenLanding } from '../../services/landingImagen.service';

vi.mock('../../services/landingImagen.service', async importOriginal => ({
  ...await importOriginal<typeof import('../../services/landingImagen.service')>(),
  guardarImagenLanding: vi.fn(), eliminarImagenLanding: vi.fn(),
}));

vi.mock('../../services/sesion.service', () => ({ obtenerPersonaSesion: vi.fn() }));

vi.mock('../../config/db', () => ({ default: { execute: vi.fn(), getConnection: vi.fn() }, checkDbConnection: vi.fn() }));
const contenido = {
  nombre_parroquia: 'Parroquia', lema: 'Fe', titulo_principal: 'Bienvenidos', descripcion_principal: 'Descripción',
  quienes_somos: { titulo: 'Quiénes somos', descripcion: 'Historia', mision: 'Misión', comunidad: 'Comunidad', servicio: 'Servicio' },
  cantidad_grupos: 12, cantidad_espacios: 7,
  valores_encabezado: { titulo: 'Valores', descripcion: 'Nuestros valores' },
  valores: [{ titulo: 'Fe', descripcion: 'Oración' }], horarios_misa: [], horarios_oficina: [],
  contacto: { titulo: 'Contacto', direccion: 'Guatemala', correo: 'contacto@example.com', telefono: '+50255551234' },
  devocion: {
    titulo: 'Devoción', descripcion: 'Cómo honramos a María', oracion: { titulo: 'Oración', texto: 'Amén.' },
    tarjetas: [{ titulo: 'Rosario', descripcion: 'Rezo diario' }],
  },
  historia: { titulo: 'Historia', descripcion: 'Origen', tarjetas: [{ titulo: 'Orden', lema: 'Lema', resumen: 'Breve', detalle: 'Completa' }] },
  fechas: { titulo: 'Fechas', descripcion: 'Calendario', tarjetas: [{ fecha: '24 de septiembre', titulo: 'La Merced', descripcion: 'Festividad' }] },
  texto_pie: 'Parroquia',
};
const conn = { execute: vi.fn(), beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
const token = (rol_id: number) => {
  vi.mocked(obtenerPersonaSesion).mockResolvedValue({ id: 1, rol_id, estado_cuenta: 'activa' });
  return jwt.sign({ id: 1, rol_id }, JWT_SECRET);
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(pool.execute).mockResolvedValue([[{ contenido: JSON.stringify(contenido) }] as any, []]);
  vi.mocked(pool.getConnection).mockResolvedValue(conn as any);
  conn.execute.mockResolvedValueOnce([[{ contenido: JSON.stringify(contenido) }], []]).mockResolvedValueOnce([{ affectedRows: 1 }, []]);
});

describe('contenido editable de landing', () => {
  it('permite lectura pública sin sesión y devuelve solo contenido', async () => {
    const response = await request(app).get('/api/public/landing').expect(200);
    expect(response.body).toEqual(contenido);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('la ruta pública no permite editar', async () => {
    await request(app).patch('/api/public/landing').send({ cantidad_grupos: 15 }).expect(404);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('exige sesión para leer y editar en la ruta administrativa', async () => {
    await request(app).get('/api/landing').expect(401);
    await request(app).patch('/api/landing').send({ cantidad_grupos: 15 }).expect(401);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it.each([ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.MINISTRO])('el rol %s no puede editar', async rol => {
    await request(app).patch('/api/landing').auth(token(rol), { type: 'bearer' }).send({ cantidad_grupos: 15 }).expect(403);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it.each([ROLES.ADMIN, ROLES.SACERDOTE])('el rol %s puede leer y editar', async rol => {
    await request(app).get('/api/landing').auth(token(rol), { type: 'bearer' }).expect(200);
    const response = await request(app).patch('/api/landing').auth(token(rol), { type: 'bearer' })
      .send({ quienes_somos: { descripcion: 'Nueva historia' }, cantidad_grupos: 0 }).expect(200);
    expect(response.body).toEqual({ quienes_somos: { descripcion: 'Nueva historia' }, cantidad_grupos: 0 });
    const guardado = JSON.parse(conn.execute.mock.calls[1][1][0]);
    expect(guardado).toEqual({ ...contenido, quienes_somos: { ...contenido.quienes_somos, descripcion: 'Nueva historia' }, cantidad_grupos: 0 });
    expect(conn.execute).toHaveBeenCalledWith('SELECT contenido FROM contenido_landing WHERE id = 1 FOR UPDATE');
    expect(conn.commit).toHaveBeenCalledOnce();
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it('edita el contacto parcialmente y conserva los campos fijos', async () => {
    const response = await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' })
      .send({ contacto: { telefono: '', direccion: 'Nueva dirección' }, cantidad_espacios: 8 }).expect(200);
    expect(response.body).toEqual({ contacto: { telefono: '', direccion: 'Nueva dirección' }, cantidad_espacios: 8 });
    const guardado = JSON.parse(conn.execute.mock.calls[1][1][0]);
    expect(guardado.contacto.correo).toBe(contenido.contacto.correo);
    for (const campo of ['nombre_parroquia', 'texto_pie'] as const) {
      expect(guardado[campo]).toEqual(contenido[campo]);
    }
  });

  it.each([
    {}, [], null, { cantidad_grupos: -1 }, { cantidad_espacios: '7' }, { cantidad_grupos: 1.5 }, { cantidad_grupos: 1000001 },
    { titulo_principal: ' ' }, { quienes_somos: { descripcion: 'a'.repeat(5001) } }, { imagen: 'foto.png' },
    { quienes_somos: {} }, { quienes_somos: { imagen: 'foto' } }, { contacto: { correo: 'incorrecto' } },
    { contacto: { telefono: 'abc' } }, { valores: [{ titulo: 'Fe' }] }, { valores: Array(21).fill({ titulo: 'Fe', descripcion: 'Test' }) },
    { horarios_misa: [{ dias: 'Domingo', horas: ['25:00'] }] }, { horarios_oficina: [{ dias: 'Domingo', horario: 123 }] },
    { quienes_somos: { tarjetas: [] } }, { historia: {} }, { historia: { imagen: 'foto' } },
    { fechas: {} }, { fechas: { imagen: 'foto' } }, { fechas: { tarjetas: [{ titulo: 'La Merced', descripcion: 'Festividad' }] } },
    { fechas: { tarjetas: Array(13).fill({ fecha: '1 de enero', titulo: 'Fecha', descripcion: 'Texto' }) } },
    { historia: { tarjetas: [{ titulo: 'Historia', resumen: 'Breve' }] } },
    { historia: { tarjetas: [{ titulo: 'Historia', resumen: 'Breve', detalle: 'Completa' }] } },
    { historia: { tarjetas: Array(7).fill({ titulo: 'Historia', lema: '', resumen: 'Breve', detalle: 'Completa' }) } },
    { devocion: {} }, { devocion: { imagen: 'foto' } }, { devocion: { oracion: { texto: ' ' } } },
    { devocion: { tarjetas: [{ titulo: 'Rosario' }] } }, { devocion: { tarjetas: Array(21).fill({ titulo: 'Rosario', descripcion: 'Rezo' }) } },
  ])('valida el body antes de acceder a la base: %j', async body => {
    await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' })
      .set('Content-Type', 'application/json').send(body === null ? 'null' : body).expect(400);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('edita presentación, valores y horarios y responde solo con cambios normalizados', async () => {
    const cambios = {
      lema: '  Comunidad de fe  ', titulo_principal: 'Bienvenidos a nuestra parroquia', descripcion_principal: 'Presentación actualizada',
      valores_encabezado: { descripcion: 'Nuestros principios' }, valores: [{ titulo: 'Servicio', descripcion: 'Servimos a todos' }],
      horarios_misa: [{ dias: 'Domingo', horas: ['08:00', '11:00'] }],
      horarios_oficina: [{ dias: 'Lunes a viernes', horario: '09:00 – 13:00' }],
    };
    const response = await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' }).send(cambios).expect(200);
    expect(response.body).toEqual({ ...cambios, lema: 'Comunidad de fe' });
    const guardado = JSON.parse(conn.execute.mock.calls[1][1][0]);
    expect(guardado.valores_encabezado.titulo).toBe(contenido.valores_encabezado.titulo);
    expect(guardado.nombre_parroquia).toBe(contenido.nombre_parroquia);
    expect(guardado.texto_pie).toBe(contenido.texto_pie);
    expect(guardado.horarios_misa).toEqual(cambios.horarios_misa);
  });

  it('edita la devoción parcialmente y reemplaza las tarjetas completas', async () => {
    const cambios = {
      devocion: { descripcion: 'Nueva introducción', oracion: { texto: 'Nuevo texto.' }, tarjetas: [{ titulo: 'Salve', descripcion: 'Canto del sábado' }] },
    };
    const response = await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' }).send(cambios).expect(200);
    expect(response.body).toEqual(cambios);
    const guardado = JSON.parse(conn.execute.mock.calls[1][1][0]);
    expect(guardado.devocion).toEqual({
      titulo: 'Devoción', descripcion: 'Nueva introducción', oracion: { titulo: 'Oración', texto: 'Nuevo texto.' },
      tarjetas: [{ titulo: 'Salve', descripcion: 'Canto del sábado' }],
    });
  });

  it('edita nuestra historia parcialmente y reemplaza las tarjetas completas', async () => {
    const cambios = { historia: { descripcion: 'Nuevo origen', tarjetas: [{ titulo: 'Escudo', lema: '', resumen: 'Breve', detalle: 'Primera parte.\n\nSegunda parte.' }] } };
    const response = await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' }).send(cambios).expect(200);
    expect(response.body).toEqual(cambios);
    const guardado = JSON.parse(conn.execute.mock.calls[1][1][0]);
    expect(guardado.historia).toEqual({ titulo: 'Historia', ...cambios.historia });
  });

  it('edita las fechas importantes y reemplaza las tarjetas completas', async () => {
    const cambios = { fechas: { titulo: 'Fechas del año', tarjetas: [{ fecha: '10 de agosto', titulo: 'Fundación', descripcion: 'Año 1218' }] } };
    const response = await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' }).send(cambios).expect(200);
    expect(response.body).toEqual(cambios);
    const guardado = JSON.parse(conn.execute.mock.calls[1][1][0]);
    expect(guardado.fechas).toEqual({ titulo: 'Fechas del año', descripcion: 'Calendario', tarjetas: cambios.fechas.tarjetas });
  });

  it('no agrega historia, devoción ni fechas vacías al editar contenido anterior a esas secciones', async () => {
    const { devocion, historia, fechas, ...anterior } = contenido;
    conn.execute.mockReset().mockResolvedValueOnce([[{ contenido: JSON.stringify(anterior) }], []]).mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' }).send({ cantidad_grupos: 3 }).expect(200);
    expect(JSON.parse(conn.execute.mock.calls[1][1][0])).toEqual({ ...anterior, cantidad_grupos: 3 });
  });

  it('permite vaciar las listas para retirar valores u horarios', async () => {
    const cambios = { valores: [], horarios_misa: [], horarios_oficina: [], devocion: { tarjetas: [] } };
    const response = await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' }).send(cambios).expect(200);
    expect(response.body).toEqual(cambios);
  });

  it('rechaza un horario sin horas', async () => {
    await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' })
      .send({ horarios_misa: [{ dias: 'Domingo', horas: [] }] }).expect(400);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('rechaza claves que intentan alterar el prototipo', async () => {
    await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' })
      .set('Content-Type', 'application/json').send('{"__proto__":{"publico":true}}').expect(400);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it.each([
    { nombre_parroquia: 'Otra parroquia' }, { texto_pie: 'Otro pie' },
  ])('rechaza campos fijos incluso junto a cambios permitidos: %j', async camposFijos => {
    await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' })
      .send({ cantidad_grupos: 15, ...camposFijos }).expect(400);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('devuelve 404 cuando falta inicializar el contenido', async () => {
    vi.mocked(pool.execute).mockResolvedValueOnce([[], []]);
    await request(app).get('/api/public/landing').expect(404);
    conn.execute.mockReset().mockResolvedValueOnce([[], []]);
    await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' }).send({ cantidad_grupos: 15 }).expect(404);
    expect(conn.rollback).toHaveBeenCalledOnce();
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it('revierte una actualización fallida y libera la conexión', async () => {
    conn.execute.mockReset().mockResolvedValueOnce([[{ contenido }], []]).mockRejectedValueOnce(new Error('SQL privado'));
    const response = await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' })
      .send({ cantidad_espacios: 9 }).expect(500);
    expect(response.body).toEqual({ mensaje: 'Error al actualizar el contenido de la landing' });
    expect(conn.rollback).toHaveBeenCalledOnce();
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledOnce();
  });

  it('controla errores al conectar o leer sin filtrar detalles internos', async () => {
    vi.mocked(pool.getConnection).mockRejectedValueOnce(new Error('credenciales privadas'));
    await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' }).send({ cantidad_grupos: 15 }).expect(500);
    vi.mocked(pool.execute).mockRejectedValueOnce(new Error('tabla privada'));
    const response = await request(app).get('/api/public/landing').expect(500);
    expect(response.body).toEqual({ mensaje: 'Error al obtener el contenido de la landing' });
  });
});

const foto = (n: number) => `/uploads/landing/subidas/00000000-0000-0000-0000-00000000000${n}.webp`;
const png = { filename: 'foto.png', contentType: 'image/png' };
const guardarContenido = (actual: object) => conn.execute.mockReset()
  .mockResolvedValueOnce([[{ contenido: JSON.stringify(actual) }], []]).mockResolvedValueOnce([{ affectedRows: 1 }, []]);

describe('fotografías de la landing', () => {
  it('exige sesión y rol de administración para subir una imagen', async () => {
    await request(app).post('/api/landing/imagenes').attach('imagen', Buffer.from('x'), png).expect(401);
    for (const rol of [ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.MINISTRO]) {
      await request(app).post('/api/landing/imagenes').auth(token(rol), { type: 'bearer' }).attach('imagen', Buffer.from('x'), png).expect(403);
    }
    expect(guardarImagenLanding).not.toHaveBeenCalled();
  });

  it.each([ROLES.ADMIN, ROLES.SACERDOTE])('el rol %s guarda la imagen y recibe solo su URL', async rol => {
    vi.mocked(guardarImagenLanding).mockResolvedValue(foto(1));
    const response = await request(app).post('/api/landing/imagenes').auth(token(rol), { type: 'bearer' })
      .attach('imagen', Buffer.from('x'), png).expect(201);
    expect(response.body).toEqual({ url: foto(1) });
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('rechaza una petición sin archivo o con un formato no permitido', async () => {
    const admin = token(ROLES.ADMIN);
    const sinArchivo = await request(app).post('/api/landing/imagenes').auth(admin, { type: 'bearer' }).field('x', '1').expect(400);
    expect(sinArchivo.body).toEqual({ message: 'Selecciona una imagen' });
    await request(app).post('/api/landing/imagenes').auth(admin, { type: 'bearer' })
      .attach('imagen', Buffer.from('x'), { filename: 'foto.gif', contentType: 'image/gif' }).expect(400);
    expect(guardarImagenLanding).not.toHaveBeenCalled();
  });

  it('informa los errores de la imagen sin filtrar detalles internos', async () => {
    const admin = token(ROLES.ADMIN);
    vi.mocked(guardarImagenLanding).mockRejectedValueOnce(new ErrorImagenLanding(400, 'La imagen debe ser JPEG, PNG o WebP válida'));
    const invalida = await request(app).post('/api/landing/imagenes').auth(admin, { type: 'bearer' }).attach('imagen', Buffer.from('x'), png).expect(400);
    expect(invalida.body).toEqual({ message: 'La imagen debe ser JPEG, PNG o WebP válida' });
    vi.mocked(guardarImagenLanding).mockRejectedValueOnce(new Error('ruta privada del servidor'));
    const interno = await request(app).post('/api/landing/imagenes').auth(admin, { type: 'bearer' }).attach('imagen', Buffer.from('x'), png).expect(500);
    expect(interno.body).toEqual({ message: 'Error al guardar la imagen' });
  });

  it('publica las fotos en las secciones fijas y en cada tarjeta, y deja la foto opcional', async () => {
    const cambios = {
      imagenes: { hero: foto(1), historia_2: foto(2) },
      valores: [{ titulo: 'Fe', descripcion: 'Oración', imagen: foto(3) }, { titulo: 'Servicio', descripcion: 'Servir' }],
      devocion: { tarjetas: [{ titulo: 'Rosario', descripcion: 'Rezo', imagen: foto(4) }] },
      fechas: { tarjetas: [{ fecha: '24 de septiembre', titulo: 'La Merced', descripcion: 'Festividad', imagen: foto(5) }] },
    };
    const response = await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' }).send(cambios).expect(200);
    expect(response.body).toEqual(cambios);
    const guardado = JSON.parse(conn.execute.mock.calls[1][1][0]);
    expect(guardado.imagenes).toEqual(cambios.imagenes);
    expect(guardado.valores[0].imagen).toBe(foto(3));
    expect(guardado.fechas.tarjetas[0].imagen).toBe(foto(5));
    expect(eliminarImagenLanding).not.toHaveBeenCalled();
  });

  it.each([
    { imagenes: { hero: 'https://sitio.example/foto.webp' } }, { imagenes: { hero: '/uploads/landing/subidas/../x.webp' } },
    { imagenes: { hero: '/uploads/espacios/subidas/00000000-0000-0000-0000-000000000001.webp' } },
    { imagenes: { hero: '/uploads/landing/portada.jpg' } }, { imagenes: { hero: '/uploads/landing/Portada.webp' } },
    { imagenes: { hero: '/uploads/landing/subidas/../portada.webp' } },
    { imagenes: { hero: 42 } }, { imagenes: { otra: '/uploads/landing/subidas/00000000-0000-0000-0000-000000000001.webp' } }, { imagenes: {} },
    { valores: [{ titulo: 'Fe', descripcion: 'Oración', imagen: '/etc/passwd' }] },
    { devocion: { tarjetas: [{ titulo: 'Rosario', descripcion: 'Rezo', imagen: 'javascript:alert(1)' }] } },
    { fechas: { tarjetas: [{ fecha: '1 de enero', titulo: 'Año', descripcion: 'Nuevo', imagen: 'x.webp' }] } },
  ])('rechaza fotos que no fueron subidas desde el panel: %j', async body => {
    await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' }).send(body).expect(400);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  it('acepta las fotos incluidas en el despliegue y las conserva en el contenido', async () => {
    const incluida = '/uploads/landing/fecha-san-pedro-nolasco-v1.webp';
    const response = await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' })
      .send({ imagenes: { hero: incluida }, fechas: { tarjetas: [{ fecha: '28 de enero', titulo: 'San Pedro Nolasco', descripcion: 'Fiesta', imagen: incluida }] } }).expect(200);
    expect(response.body.imagenes).toEqual({ hero: incluida });
    expect(JSON.parse(conn.execute.mock.calls[1][1][0]).fechas.tarjetas[0].imagen).toBe(incluida);
  });

  it('borra del disco solo las fotos que el contenido deja de usar', async () => {
    guardarContenido({
      ...contenido,
      imagenes: { hero: foto(1), quienes_1: foto(2) },
      valores: [{ titulo: 'Fe', descripcion: 'Oración', imagen: foto(3) }],
      devocion: { ...contenido.devocion, tarjetas: [{ titulo: 'Rosario', descripcion: 'Rezo', imagen: foto(4) }] },
    });
    await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' })
      .send({ imagenes: { hero: '' }, valores: [{ titulo: 'Fe', descripcion: 'Oración' }], devocion: { tarjetas: [{ titulo: 'Rosario', descripcion: 'Rezo', imagen: foto(4) }] } })
      .expect(200);
    const borradas = vi.mocked(eliminarImagenLanding).mock.calls.map(([url]) => url).sort();
    expect(borradas).toEqual([foto(1), foto(3)]);
    expect(conn.commit).toHaveBeenCalledOnce();
  });

  it('no borra fotos si la actualización falla', async () => {
    conn.execute.mockReset().mockResolvedValueOnce([[{ contenido: JSON.stringify({ ...contenido, imagenes: { hero: foto(1) } }) }], []])
      .mockRejectedValueOnce(new Error('SQL privado'));
    await request(app).patch('/api/landing').auth(token(ROLES.ADMIN), { type: 'bearer' }).send({ imagenes: { hero: '' } }).expect(500);
    expect(eliminarImagenLanding).not.toHaveBeenCalled();
  });
});

