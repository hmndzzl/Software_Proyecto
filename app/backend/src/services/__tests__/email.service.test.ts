import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sendMail = vi.fn();
vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn(() => ({ sendMail })) },
}));

import { armarCorreoCuenta, enviarCorreoCuenta } from '../email.service';

describe('email.service - correos de cuenta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.SMTP_HOST = 'smtp.test';
    process.env.SMTP_FROM = 'Parroquia <no-reply@parroquia.test>';
    process.env.FRONTEND_URL = 'https://app.parroquia.test/';
  });

  afterEach(() => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_FROM;
    delete process.env.FRONTEND_URL;
  });

  it('aprobada: incluye el enlace de inicio de sesión', () => {
    const correo = armarCorreoCuenta('Ana', 'aprobada');

    expect(correo.subject).toBe('Tu cuenta fue aprobada');
    expect(correo.text).toContain('¡Buenas noticias! Tu cuenta ha sido aprobada');
    expect(correo.text).toContain('Iniciar sesión: https://app.parroquia.test/login');
    expect(correo.text).toContain('Parroquia San Pedro Nolasco, Ciudad San Cristobal');
    expect(correo.html).toContain('href="https://app.parroquia.test/login"');
  });

  it('rechazada: indica contactar al administrador y no incluye enlace de login', () => {
    const correo = armarCorreoCuenta('Ana', 'rechazada');

    expect(correo.subject).toBe('Tu cuenta no fue aprobada');
    expect(correo.text).toContain('Lamentablemente, en esta ocasión tu cuenta no pudo ser aprobada');
    expect(correo.text).toContain('administrador parroquial');
    expect(correo.text).toContain('Parroquia San Pedro Nolasco, Ciudad San Cristobal');
    expect(correo.text).not.toContain('/login');
  });

  it('desactivada: avisa que ya no podrá iniciar sesión, sin decir que no fue aprobada', () => {
    const correo = armarCorreoCuenta('Ana', 'desactivada');

    expect(correo.subject).toBe('Tu cuenta fue desactivada');
    expect(correo.text).toContain('ha sido desactivada');
    expect(correo.text).toContain('administrador parroquial');
    expect(correo.text).not.toContain('no pudo ser aprobada');
    expect(correo.text).not.toContain('/login');
  });

  it('escapa el nombre en el HTML', () => {
    expect(armarCorreoCuenta('<b>Ana</b>', 'rechazada').html).toContain('&lt;b&gt;Ana&lt;/b&gt;');
  });

  it('envía el correo al destinatario', async () => {
    sendMail.mockResolvedValueOnce({});

    const enviado = await enviarCorreoCuenta('ana@gmail.com', 'Ana', 'aprobada');

    expect(enviado).toBe(true);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ana@gmail.com', from: 'Parroquia <no-reply@parroquia.test>', subject: 'Tu cuenta fue aprobada' })
    );
  });

  it('no envía ni lanza si SMTP no está configurado', async () => {
    delete process.env.SMTP_HOST;

    await expect(enviarCorreoCuenta('ana@gmail.com', 'Ana', 'aprobada')).resolves.toBe(false);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('no lanza si falla el transporte', async () => {
    sendMail.mockRejectedValueOnce(new Error('SMTP caído'));

    await expect(enviarCorreoCuenta('ana@gmail.com', 'Ana', 'rechazada')).resolves.toBe(false);
  });
});
