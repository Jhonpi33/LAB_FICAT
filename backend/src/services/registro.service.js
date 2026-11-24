import mongoose from 'mongoose';
import Usuario from '../models/Usuario.js';
import { enviarCorreo, enlace, huella, nuevoToken } from './correo.service.js';
import { httpError } from '../utils/responses.js';

const Registro = mongoose.model('RegistroPendiente', new mongoose.Schema({
  email: { type: String, unique: true }, token: String,
  vence: { type: Date, expires: 0 }, enviado: Date
}));

export async function iniciarRegistro(email) {
  if (await Usuario.exists({ email })) return;
  const token = nuevoToken();
  try {
    await Registro.findOneAndUpdate({ email, enviado: { $lt: new Date(Date.now() - 60000) } }, {
      email, token: huella(token), vence: new Date(Date.now() + 3600000), enviado: new Date()
    }, { upsert: true });
  } catch (error) {
    if (error.code === 11000) return;
    throw error;
  }
  try {
    await enviarCorreo(email, 'Confirma tu correo en LABFICAT', 'Completa tu registro en la próxima hora usando este enlace: ' + enlace('crear-cuenta', token));
  } catch (error) {
    await Registro.deleteOne({ token: huella(token) });
    throw error;
  }
}

export async function completarRegistro({ token, nombre, password, ficha }) {
  const pendiente = await Registro.findOne({ token: huella(token), vence: { $gt: new Date() } });
  if (!pendiente) throw httpError(410, 'El enlace venció o ya se utilizó. Solicita otro desde Crear cuenta.');
  try {
    await Usuario.create({ email: pendiente.email, nombre, password, verificadoEn: new Date(),
      aprendiz: ficha ? 'pendiente' : 'externo', ficha });
  } catch (error) {
    if (error.code !== 11000) throw error;
    throw httpError(409, 'La cuenta ya existe. Puedes iniciar sesión.');
  }
  await Registro.deleteOne({ _id: pendiente._id });
  try {
    await enviarCorreo(pendiente.email, 'Has creado una cuenta en LABFICAT', 'Hola ' + nombre + ', tu cuenta en LABFICAT ha sido creada y tu correo está verificado.');
    return 'Cuenta creada. Ya puedes iniciar sesión.';
  } catch {
    return 'Cuenta creada. Puedes entrar, aunque el servicio no pudo enviar el correo de bienvenida.';
  }
}
