import { createHash, randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import config from '../config/env.js';
import { httpError } from '../utils/responses.js';

export const nuevoToken = () => randomBytes(32).toString('hex');
export const huella = (texto) => createHash('sha256').update(texto).digest('hex');
export const enlace = (ruta, token) => (process.env.PUBLIC_FRONTEND_URL || config.FRONTEND_URL.split(',')[0]).trim().replace(/\/$/, '') + '/#/' + ruta + '/' + encodeURIComponent(token);

const proveedor = () => process.env.MAIL_PROVIDER || 'resend';
const gmailApi = ['GMAIL_USER', 'GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN'];
const gmailSmtp = ['GMAIL_USER', 'GMAIL_APP_PASSWORD'];
const mime = nodemailer.createTransport({ streamTransport: true, buffer: true });

export function comprobarCorreo() {
  const configuraciones = { 'gmail-api': gmailApi, 'gmail-smtp': gmailSmtp, resend: ['RESEND_API_KEY', 'MAIL_FROM'] };
  const requeridas = Object.hasOwn(configuraciones, proveedor()) ? configuraciones[proveedor()] : null;
  if (!requeridas || requeridas.some(variable => !process.env[variable]?.trim()))
    throw httpError(503, 'El laboratorio debe configurar el servicio de correo.');
}

async function enviarGmail(mensaje) {
  if (proveedor() === 'gmail-smtp') {
    const smtp = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '') },
      connectionTimeout: 3500, greetingTimeout: 3500, socketTimeout: 5000
    });
    await smtp.sendMail(mensaje);
    return;
  }
  const signal = AbortSignal.timeout(10000);
  const token = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', signal,
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID, client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN, grant_type: 'refresh_token'
    })
  });
  if (!token.ok) throw new Error('Gmail OAuth');
  const { access_token } = await token.json();
  const { message } = await mime.sendMail(mensaje);
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST', signal,
    headers: { Authorization: 'Bearer ' + access_token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: message.toString('base64url') })
  });
  if (!response.ok) throw new Error('Gmail API');
}

export async function enviarCorreo(to, subject, text, attachments = []) {
  comprobarCorreo();
  if (proveedor() !== 'resend') {
    try {
      await enviarGmail({
        from: { name: 'LABFICAT', address: process.env.GMAIL_USER }, to, subject, text,
        attachments: attachments.map(adjunto => ({ ...adjunto, encoding: 'base64' })),
        disableFileAccess: true, disableUrlAccess: true
      });
      return;
    } catch {
      throw httpError(503, 'Gmail no aceptó el envío. Revisa la configuración y vuelve a intentarlo.');
    }
  }
  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to, subject, text, attachments })
    });
  } catch {
    throw httpError(503, 'El servicio de correo no responde. Inténtalo de nuevo.');
  }
  if (!response.ok) throw httpError(503, 'El proveedor no aceptó el correo. Revisa el remitente configurado.');
}
