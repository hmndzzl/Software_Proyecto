import request from 'supertest';
import { describe, expect, it } from 'vitest';
import express from 'express';
import mediaRoutes from '../../routes/media.routes';

const app = express().use('/uploads', mediaRoutes);

describe('fotografías públicas de espacios', () => {
  it('sirve solo la versión WebP optimizada sin requerir sesión', async () => {
    const response = await request(app).get('/uploads/espacios/salon-01-v1.webp').expect(200);
    expect(response.headers['content-type']).toMatch(/^image\/webp/);
    expect(response.headers['cache-control']).toContain('immutable');
    expect(response.body.length).toBeGreaterThan(1000);
  });

  it('no publica archivos desconocidos', async () => {
    await request(app).get('/uploads/espacios/desconocido.webp').expect(404);
    await request(app).get('/uploads/espacios/salon-01-v1.jpg').expect(404);
    await request(app).get('/uploads/espacios/salon-01-v1.webp/otro').expect(404);
  });
});

describe('fotografías públicas de la landing', () => {
  it('sirve solo la versión WebP optimizada sin requerir sesión', async () => {
    const response = await request(app).get('/uploads/landing/historia-1-v1.webp').expect(200);
    expect(response.headers['content-type']).toMatch(/^image\/webp/);
    expect(response.headers['cache-control']).toContain('immutable');
  });

  it('no publica archivos desconocidos', async () => {
    await request(app).get('/uploads/landing/desconocido.webp').expect(404);
    await request(app).get('/uploads/landing/historia-1-v1.jpg').expect(404);
  });
});
