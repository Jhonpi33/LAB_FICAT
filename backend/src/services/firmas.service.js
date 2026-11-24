import mongoose from 'mongoose';
import sharp from 'sharp';
import Firma, { FirmaMuestra } from '../models/FirmaSolicitud.js';
import Solicitud from '../models/Solicitud.js';
import Muestra from '../models/Muestra.js';
import { nuevoToken, huella, enlace, enviarCorreo, comprobarCorreo } from './correo.service.js';
import { generarRecepcion, incorporarFirma, validarRecepcion } from './recepcion-pdf.js';
import { httpError } from '../utils/responses.js';

async function buscarSolicitud(id) {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, 'Solicitud no encontrada.');
  const solicitud = await Solicitud.findOne({ _id: id, eliminado: false }).populate('cliente_id');
  if (!solicitud?.cliente_id || solicitud.cliente_id.eliminado) throw httpError(404, 'Solicitud o cliente no encontrado.');
  return solicitud;
}

async function contexto(id, tipo) {
  if (tipo === 'solicitud') {
    const solicitud = await buscarSolicitud(id);
    return { solicitud, modelo: Firma, filtro: { solicitud: solicitud._id } };
  }
  if (!mongoose.isValidObjectId(id)) throw httpError(404, 'Muestra no encontrada.');
  const muestra = await Muestra.findOne({ _id: id, eliminado: false });
  if (!muestra) throw httpError(404, 'Muestra no encontrada.');
  const solicitud = await buscarSolicitud(muestra.solicitud_id);
  return { solicitud, muestra, modelo: FirmaMuestra, filtro: { muestra: muestra._id } };
}

export async function preparar(id, receptor, tipo = 'solicitud') {
  const { solicitud, muestra, modelo, filtro } = await contexto(id, tipo);
  const actual = await modelo.findOne(filtro).select('-borrador -pdf');
  const cliente = solicitud.cliente_id;
  const muestras = muestra ? [muestra] : await Muestra.find({ solicitud_id: id, eliminado: false }).sort('fecha_creacion').select('codigo nombre_muestra tipo_fisico').limit(6);
  return {
    cliente: actual?.formulario || actual?.firmada ? actual.cliente : cliente.nombre,
    correo: actual?.formulario || actual?.firmada ? actual.correo : cliente.email,
    codigoMuestra: muestra?.codigo,
    formulario: actual?.formulario ?? {
      entrega: cliente.nombre, cedula: cliente.numero_documento, contacto: cliente.nombre, recibe: receptor,
      fechaRecepcion: muestra?.fecha_recepcion?.toLocaleString('es-CO', { timeZone: 'America/Bogota' }) || '',
      muestras: muestras.length ? muestras.slice(0, 5).map(muestra => ({
        codigo: muestra.codigo, matriz: muestra.nombre_muestra, tipo: muestra.tipo_fisico
      })) : [{}]
    },
    excedeFormato: muestras.length > 5,
    estado: actual?.firmada ? 'firmada' : actual?.enviada || actual?.vence > new Date() ? 'pendiente' : actual?.formulario ? 'borrador' : 'nuevo',
    tienePdf: Boolean(actual?.formulario || actual?.firmada),
    copiaEnviada: actual?.copiaEnviada
  };
}

export async function guardar(id, datos, tipo = 'solicitud') {
  const { solicitud, muestra, modelo, filtro } = await contexto(id, tipo);
  const cliente = solicitud.cliente_id;
  const formulario = validarRecepcion(datos);
  if (muestra) {
    if (formulario.muestras.length !== 1) throw httpError(400, 'Este formato corresponde a una sola muestra.');
    formulario.muestras[0].codigo = muestra.codigo;
  }
  const borrador = await generarRecepcion(cliente, formulario);
  try {
    await modelo.findOneAndUpdate({ ...filtro, firmada: null, enviada: null, token: null }, {
      $set: { solicitud: solicitud._id, cliente: cliente.nombre, correo: cliente.email, formulario, borrador },
      $inc: { __v: 1 }
    }, { upsert: true });
  } catch (error) {
    if (error.code === 11000) throw httpError(409, 'La recepción ya está en validación o fue firmada. Abre el documento de nuevo.');
    throw error;
  }
}

export async function descargarInterno(id, tipo = 'solicitud') {
  const { modelo, filtro } = await contexto(id, tipo);
  const firma = await modelo.findOne(filtro);
  const pdf = firma?.pdf || firma?.borrador;
  if (!pdf) throw httpError(404, 'Guarda el formulario para generar el PDF.');
  return pdf;
}

const adjunto = (firma, pdf) => [{ filename: 'Recepcion-' + (firma.muestra || firma.solicitud) + '.pdf', content: pdf.toString('base64') }];

async function enviarCopia(firma) {
  await enviarCorreo(firma.correo, 'LABFICAT · Recepción firmada', 'Se registró tu firma. Adjuntamos el documento firmado.',
    adjunto(firma, firma.pdf));
  await firma.constructor.updateOne({ _id: firma._id }, { copiaEnviada: new Date() });
}

export async function solicitarFirma(id, tipo = 'solicitud') {
  const { modelo, filtro } = await contexto(id, tipo);
  comprobarCorreo();
  const firma = await modelo.findOne(filtro).select('+token');
  if (!firma?.borrador && !firma?.pdf) throw httpError(409, 'Primero guarda el formulario de recepción.');
  const token = nuevoToken();
  const hash = huella(token);
  const ahora = new Date();
  const reserva = await modelo.findOneAndUpdate({
    _id: firma._id, __v: firma.__v,
    $or: [{ ultimoIntento: null }, { ultimoIntento: { $lt: new Date(Date.now() - 30000) } }]
  }, {
    $set: firma.firmada ? { ultimoIntento: ahora } : {
      ultimoIntento: ahora, token: hash, vence: new Date(Date.now() + 86400000)
    },
    $inc: { __v: 1 }
  });
  if (!reserva) throw httpError(409, 'Se está enviando el documento o cambió su estado. Vuelve a intentarlo en unos segundos.');
  try {
    if (firma.firmada) {
      await enviarCopia(firma);
      return 'Se envió una copia del documento firmado.';
    }
    await enviarCorreo(firma.correo, 'LABFICAT · Valida la recepción de muestras',
      'Revisa el PDF adjunto y confirma la recepción con tu firma durante las próximas 24 horas: ' + enlace('firmar', token),
      adjunto(firma, firma.borrador));
    await modelo.updateOne({ _id: firma._id, token: hash }, { enviada: new Date() });
    return 'Se envió el enlace para revisar y firmar el PDF al correo del cliente.';
  } catch (error) {
    const reversar = { $unset: { ultimoIntento: 1 } };
    if (!firma.firmada && firma.token) {
      reversar.$set = { token: firma.token, vence: firma.vence };
    } else if (!firma.firmada) {
      Object.assign(reversar.$unset, { token: 1, vence: 1 });
    }
    await modelo.updateOne({
      _id: firma._id, ...(firma.firmada ? { ultimoIntento: ahora } : { token: hash })
    }, reversar);
    throw error;
  }
}

function filtroPendiente(token) {
  if (!/^[0-9a-f]{64}$/.test(token)) throw httpError(410, 'El enlace de firma no está disponible.');
  return { token: huella(token), vence: { $gt: new Date() }, firmada: null };
}

export async function consultarFirma(token) {
  const filtro = filtroPendiente(token);
  const firma = await FirmaMuestra.findOne(filtro).select('cliente solicitud borrador')
    || await Firma.findOne(filtro).select('cliente solicitud borrador');
  if (!firma?.borrador) throw httpError(410, 'El enlace venció o el documento ya está firmado.');
  return firma;
}

export async function firmar(token, datos) {
  const firma = await consultarFirma(token);
  if (datos.acepto !== true || typeof datos.imagen !== 'string' || datos.imagen.length > 1340000)
    throw httpError(400, 'Adjunta una imagen de hasta 1 MB y confirma el documento.');
  let imagen;
  try {
    const entrada = sharp(Buffer.from(datos.imagen, 'base64'), { limitInputPixels: 12000000 });
    if (!['png', 'jpeg'].includes((await entrada.metadata()).format)) throw new Error('Formato no admitido');
    imagen = await entrada.rotate().resize({ width: 850, height: 400, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  } catch {
    throw httpError(400, 'Selecciona una imagen PNG o JPG válida.');
  }
  const pdf = await incorporarFirma(firma.borrador, imagen);
  const guardada = await firma.constructor.findOneAndUpdate({ _id: firma._id, ...filtroPendiente(token) },
    { $set: { firmada: new Date(), pdf }, $unset: { token: 1 }, $inc: { __v: 1 } }, { new: true });
  if (!guardada) throw httpError(409, 'Este enlace ya no está disponible.');
  try {
    await enviarCopia(guardada);
    return 'Documento firmado. Enviamos una copia a tu correo.';
  } catch {
    return 'Documento firmado y guardado. El laboratorio puede reenviar la copia a tu correo.';
  }
}
