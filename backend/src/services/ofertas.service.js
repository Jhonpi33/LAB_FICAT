import mongoose from 'mongoose';
import Oferta from '../models/Oferta.js';
import CorreoOferta from '../models/CorreoOferta.js';
import Cliente from '../models/Cliente.js';
import Solicitud from '../models/Solicitud.js';
import Cotizacion from '../models/Cotizacion.js';
import Parametro from '../models/ParametroAnalisis.js';
import Pago from '../models/Pago.js';
import Secuencia from '../models/Secuencia.js';
import { httpError } from '../utils/responses.js';
import { generarOferta, validarFirma, firmarOferta, generarRecibo } from './oferta-pdf.js';
import { enviarCorreo, comprobarCorreo, nuevoToken, huella, enlace } from './correo.service.js';

const campos = ['ciudad','departamento','cargo','contacto','clasificacion','vigencia','entrega','responsable','cargoResponsable','observaciones'];
function texto(valor, campo, max = 160) {
  if (typeof valor !== 'string' || valor.trim().length > max || /[\x00-\x1f]/.test(valor)) throw httpError(400, 'Revisa ' + campo + '.');
  return valor.trim();
}
export async function buscarCliente(q) {
  const dato = texto(q, 'correo o documento', 120);
  if (!dato) throw httpError(400, 'Escribe el correo o documento.');
  return Cliente.find({ eliminado: false, $or: [{ email: dato.toLowerCase() }, { numero_documento: dato }] }).lean();
}

export async function crear(data) {
  if (!/^[a-zA-Z0-9-]{20,64}$/.test(data.clave || '')) throw httpError(400, 'Identificador de solicitud no válido.');
  const anterior = await Oferta.findOne({ clave: data.clave }).select('_id solicitud cotizacion numero');
  if (anterior) return anterior;
  const f = Object.fromEntries(campos.map(campo => [campo, texto(data.formulario?.[campo] ?? '', campo)]));
  for (const campo of campos.filter(c => c !== 'observaciones')) if (!f[campo]) throw httpError(400, 'Completa ' + campo + '.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.vigencia) || !Number.isFinite(Date.parse(f.vigencia))) throw httpError(400, 'Vigencia no válida.');
  f.fecha = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  f.ensayos = data.ensayos;
  if (!Array.isArray(f.ensayos) || f.ensayos.length < 1 || f.ensayos.length > 5) throw httpError(400, 'La plantilla admite de uno a cinco ensayos.');
  const items = [];
  for (const ensayo of f.ensayos) {
    if (!mongoose.isObjectIdOrHexString(ensayo.parametro_id)) throw httpError(400, 'Selecciona el ensayo del catálogo.');
    const parametro = await Parametro.findOne({ _id: ensayo.parametro_id, activo: true, eliminado: false });
    if (!parametro) throw httpError(400, 'El ensayo ya no está disponible.');
    const cantidad = Number(ensayo.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0 || cantidad > 9999) throw httpError(400, 'Cantidad no válida.');
    for (const campo of ['codigo','unidad','metodo','tecnica']) ensayo[campo] = texto(ensayo[campo] ?? '', campo, 100);
    if (!ensayo.metodo || !ensayo.tecnica) throw httpError(400, 'Completa método y técnica.');
    items.push({ parametro_id: parametro._id, descripcion: parametro.nombre, cantidad, precio_unitario: parametro.precio,
      subtotal: Math.round(cantidad * parametro.precio * 100) / 100 });
  }
  const firma = await validarFirma(data.firmaResponsable);
  const descripcion = texto(data.descripcion, 'Descripción de la muestra', 160);
  f.descripcion = descripcion;
  if (!descripcion) throw httpError(400, 'Describe la muestra.');
  if (data.cliente_id && !mongoose.isObjectIdOrHexString(data.cliente_id)) throw httpError(400, 'Cliente no válido.');
  const session = await mongoose.startSession();
  let resultado;
  try {
    await session.withTransaction(async () => {
      let cliente;
      if (data.cliente_id) cliente = await Cliente.findOne({ _id: data.cliente_id, eliminado: false }).session(session);
      else {
        const entrada = data.cliente || {};
        const datos = Object.fromEntries(['nombre','numero_documento','tipo_documento','email','telefono','direccion','tipo_cliente','rol','ficha'].map(c => [c, texto(entrada[c] ?? '', c)]));
        datos.email = datos.email.toLowerCase();
        if (datos.tipo_cliente === 'interno' && (!['instructor','aprendiz','administrativo'].includes(datos.rol) || !datos.ficha))
          throw httpError(400, 'Para un cliente interno indica el rol SENA y la ficha.');
        if (await Cliente.exists({ $or: [{ numero_documento: datos.numero_documento }, { email: datos.email }] }).session(session))
          throw httpError(409, 'El cliente ya existe. Búscalo por correo o documento.');
        [cliente] = await Cliente.create([datos], { session });
      }
      if (!cliente) throw httpError(404, 'Cliente no encontrado.');
      const anio = Number(f.fecha.slice(0,4));
      const secuencia = await Secuencia.findOneAndUpdate({ tipo: 'cotizaciones', anio }, { $inc: { secuencia: 1 } }, { upsert: true, new: true, session });
      const numero = String(secuencia.secuencia).padStart(4,'0') + '-' + anio + 'V1';
      const borrador = await generarOferta(numero, cliente, f, items, firma);
      const [solicitud] = await Solicitud.create([{ cliente_id: cliente._id, tipo_cliente: cliente.tipo_cliente,
        descripcion, estado: 'cotizada', requiere_pago: cliente.tipo_cliente === 'externo' }], { session });
      const total = items.reduce((n,i) => n + i.subtotal, 0);
      const [cotizacion] = await Cotizacion.create([{ solicitud_id: solicitud._id, numero: secuencia.secuencia, subtotal: total, total, items }], { session });
      const [oferta] = await Oferta.create([{ solicitud: solicitud._id, cotizacion: cotizacion._id, clave: data.clave,
        numero, cliente: cliente.nombre, correo: cliente.email, formulario: f, borrador }], { session });
      await CorreoOferta.create([{ solicitud: solicitud._id, evento: 'firma' }], { session });
      resultado = { _id: oferta._id, solicitud: solicitud._id, cotizacion: cotizacion._id, numero };
    });
  } catch (error) {
    if (error.code === 11000) {
      const existente = await Oferta.findOne({ clave: data.clave }).select('_id solicitud cotizacion numero');
      if (existente) return existente;
      throw httpError(409, 'Ya existe un registro con estos datos. Revisa el cliente y vuelve a intentar.');
    }
    throw error;
  } finally { await session.endSession(); }
  return resultado;
}

export async function obtener(id) {
  if (!mongoose.isObjectIdOrHexString(id)) throw httpError(404, 'Oferta no encontrada.');
  const oferta = await Oferta.findOne({ solicitud: id });
  if (!oferta) throw httpError(404, 'Esta solicitud aún no tiene una oferta en el nuevo formato.');
  return oferta;
}
const adjunto = (oferta, pdf = oferta.pdf || oferta.borrador) => [{ filename: oferta.numero + '.pdf', content: pdf.toString('base64') }];

export async function enviar(id, destino) {
  const oferta = await obtener(id);
  comprobarCorreo();
  if (!['cliente','produccion','recibo'].includes(destino)) throw httpError(400, 'Destino no válido.');
  if (destino !== 'cliente' && !oferta.firmada) throw httpError(409, 'La oferta necesita la aceptación firmada del cliente.');
  if (destino === 'produccion' && !/^\S+@\S+\.\S+$/.test(process.env.PRODUCCION_EMAIL || '')) throw httpError(503, 'Configura el correo de Producción.');
  const pago = destino === 'recibo' ? await Pago.findOne({ cotizacion_id: oferta.cotizacion, estado: 'confirmado', eliminado: false }) : null;
  if (destino === 'recibo' && !pago)
    throw httpError(409, 'Primero confirma el pago individual de esta cotización.');
  const ahora = new Date();
  const reserva = await Oferta.findOneAndUpdate({ _id: oferta._id, $or: [{ ultimoIntento: null }, { ultimoIntento: { $lt: new Date(Date.now()-60000) } }] }, { ultimoIntento: ahora });
  if (!reserva) throw httpError(409, 'Hay un envío en curso. Espera un minuto.');
  try {
    if (destino === 'cliente' && !oferta.firmada) {
      const token = nuevoToken();
      await Oferta.updateOne({ _id: oferta._id }, { token: huella(token), vence: new Date(Date.now()+86400000) });
      await enviarCorreo(oferta.correo, 'LABFICAT · Firma tu oferta ' + oferta.numero,
        'Revisa la oferta adjunta y firma su aceptación en las próximas 24 horas: ' + enlace('firmar-oferta',token), adjunto(oferta));
      await Oferta.updateOne({ _id: oferta._id }, { enviada: new Date() });
    } else {
      const correo = destino === 'produccion' ? process.env.PRODUCCION_EMAIL : oferta.correo;
      const asunto = destino === 'produccion' ? 'Generar cupón individual' : destino === 'recibo' ? 'Pago confirmado · Recibo' : 'Oferta firmada';
      await enviarCorreo(correo, 'LABFICAT · ' + asunto + ' · ' + oferta.numero,
        destino === 'produccion' ? 'Adjuntamos la oferta aceptada para generar el cupón individual de esta cotización. Cliente: ' + oferta.cliente
          : destino === 'recibo' ? 'Confirmamos el pago de tu cotización. Adjuntamos la oferta firmada con el registro del pago como recibo.' : 'Adjuntamos tu oferta firmada.',
        adjunto(oferta, pago ? await generarRecibo(oferta, pago) : undefined));
      const campo = destino === 'produccion' ? 'produccionEnviada' : destino === 'recibo' ? 'reciboEnviado' : 'enviada';
      await Oferta.updateOne({ _id: oferta._id }, { [campo]: new Date() });
    }
  } finally { await Oferta.updateOne({ _id: oferta._id, ultimoIntento: ahora }, { $unset: { ultimoIntento: 1 } }); }
  return 'El proveedor aceptó el envío del correo.';
}

function filtroToken(token) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw httpError(410, 'Enlace de firma no disponible.');
  return { token: huella(token), vence: { $gt: new Date() }, firmada: null };
}
export async function consultarFirma(token) {
  const oferta = await Oferta.findOne(filtroToken(token));
  if (!oferta) throw httpError(410, 'El enlace venció o la oferta ya está firmada.');
  return oferta;
}
export async function firmar(token, datos) {
  if (datos.acepto !== true) throw httpError(400, 'Confirma que aceptas la oferta.');
  const oferta = await consultarFirma(token);
  const pdf = await firmarOferta(oferta.borrador, await validarFirma(datos.imagen));
  await mongoose.connection.transaction(async session => {
    const guardada = await Oferta.findOneAndUpdate({ _id: oferta._id, ...filtroToken(token) },
      { $set: { pdf, firmada: new Date() }, $unset: { token: 1 } }, { session });
    if (!guardada) throw httpError(409, 'La oferta ya fue firmada.');
    await Cotizacion.updateOne({ _id: oferta.cotizacion }, { estado: 'aceptada' }, { session });
    await Solicitud.updateOne({ _id: oferta.solicitud }, { estado: 'aceptada' }, { session });
    await CorreoOferta.create([{ solicitud: oferta.solicitud, evento: 'copia' }], { session });
  });
  return 'Oferta firmada y guardada. La copia se enviará automáticamente a tu correo.';
}
