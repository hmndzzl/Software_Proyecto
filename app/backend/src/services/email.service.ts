import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export type EstadoCuentaCorreo = 'aprobada' | 'rechazada' | 'desactivada';

let transporter: Transporter | null = null;

// Sin SMTP_HOST el correo queda deshabilitado (dev/pruebas): se avisa en log y no se envía.
function obtenerTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

const escaparHtml = (texto: string) =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function urlLogin(): string {
  const base = (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
  return `${base}/login`;
}

export function armarCorreoCuenta(nombre: string, estado: EstadoCuentaCorreo) {
  if (estado === 'aprobada') {
    const url = urlLogin();
    const lineas = [
      `Hola ${nombre},`,
      '¡Buenas noticias! Tu cuenta ha sido aprobada y ya puedes acceder a la plataforma.',
      `Para ingresar, usa el correo que proporcionaste para crear tu cuenta:\n👉 Iniciar sesión: ${url}`,
      'Si tienes alguna duda o inconveniente para acceder, no dudes en responder a este correo.',
      '¡Te damos la bienvenida!\nParroquia San Pedro Nolasco, Ciudad San Cristobal',
    ];
    return {
      subject: 'Tu cuenta fue aprobada',
      text: lineas.join('\n\n'),
      html: `<p>Hola ${escaparHtml(nombre)},</p><p>¡Buenas noticias! Tu cuenta ha sido aprobada y ya puedes acceder a la plataforma.</p>` +
        `<p>Para ingresar, usa el correo que proporcionaste para crear tu cuenta:<br>👉 <a href="${escaparHtml(url)}">Iniciar sesión</a></p>` +
        '<p>Si tienes alguna duda o inconveniente para acceder, no dudes en responder a este correo.</p>' +
        '<p>¡Te damos la bienvenida!<br>Parroquia San Pedro Nolasco, Ciudad San Cristobal</p>',
    };
  }
  if (estado === 'desactivada') {
    return {
      subject: 'Tu cuenta fue desactivada',
      text: [
        `Hola ${nombre},`,
        'Te informamos que tu cuenta ha sido desactivada y ya no podrás iniciar sesión en la plataforma.',
        'Si crees que se trata de un error o deseas más información, puedes comunicarte con el administrador parroquial.',
        'Agradecemos tu servicio.\nParroquia San Pedro Nolasco, Ciudad San Cristobal',
      ].join('\n\n'),
      html: `<p>Hola ${escaparHtml(nombre)},</p><p>Te informamos que tu cuenta ha sido desactivada y ya no podrás iniciar sesión en la plataforma.</p>` +
        '<p>Si crees que se trata de un error o deseas más información, puedes comunicarte con el administrador parroquial.</p>' +
        '<p>Agradecemos tu servicio.<br>Parroquia San Pedro Nolasco, Ciudad San Cristobal</p>',
    };
  }
  const lineas = [
    `Hola ${nombre},`,
    'Gracias por querer formar parte de la parroquia. Lamentablemente, en esta ocasión tu cuenta no pudo ser aprobada.',
    'Si crees que se trata de un error o deseas más información, puedes comunicarte con el administrador parroquial, quien con gusto revisará tu caso.',
    'Agradecemos tu comprensión.\nParroquia San Pedro Nolasco, Ciudad San Cristobal',
  ];
  return {
    subject: 'Tu cuenta no fue aprobada',
    text: lineas.join('\n\n'),
    html: `<p>Hola ${escaparHtml(nombre)},</p><p>Gracias por querer formar parte de la parroquia. Lamentablemente, en esta ocasión tu cuenta no pudo ser aprobada.</p>` +
      '<p>Si crees que se trata de un error o deseas más información, puedes comunicarte con el administrador parroquial, quien con gusto revisará tu caso.</p>' +
      '<p>Agradecemos tu comprensión.<br>Parroquia San Pedro Nolasco, Ciudad San Cristobal</p>',
  };
}

// Nunca lanza: el correo es un efecto secundario y no debe tumbar la aprobación/rechazo ya guardado.
export async function enviarCorreoCuenta(destino: string, nombre: string, estado: EstadoCuentaCorreo): Promise<boolean> {
  try {
    const transport = obtenerTransporter();
    if (!transport) {
      console.warn('SMTP no configurado: no se envió el correo de cuenta', estado);
      return false;
    }
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: destino,
      ...armarCorreoCuenta(nombre, estado),
    });
    return true;
  } catch (error) {
    console.error('Error en enviarCorreoCuenta:', error);
    return false;
  }
}
