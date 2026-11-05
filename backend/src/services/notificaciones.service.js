import mongoose from 'mongoose';
import Notificacion from '../models/Notificacion.js';
import Cliente from '../models/Cliente.js';
import { httpError } from '../utils/responses.js';

const TIPO_LABEL = {
  cambio_etapa: 'Cambio de etapa',
  incidencia: 'Incidencia',
  cambio_fecha: 'Cambio de fecha',
  resultados_disponibles: 'Resultados disponibles',
  conservacion: 'Conservación',
  otro: 'Otro'
};

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Notificación no encontrada');
}

function conRelaciones(notificacion) {
  return Notificacion.populate(notificacion, [
    { path: 'muestra_id', select: 'codigo nombre_muestra' },
    { path: 'cliente_id', select: 'nombre email' }
  ]);
}

async function listar({ q, estado }) {
  const filtro = { eliminado: false };

  if (estado) filtro.estado = estado;

  if (q) {
    const regex = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filtro.$or = [{ asunto: regex }, { correo_destino: regex }];
  }

  return Notificacion.find(filtro)
    .populate('muestra_id', 'codigo nombre_muestra')
    .populate('cliente_id', 'nombre email')
    .sort({ fecha_programada: -1 });
}

/**
 * Encola una notificación automática de un evento del sistema
 * (cambio de etapa, incidencia, demora, resultados...).
 * Si la muestra tiene cliente con correo, se usa como destinatario.
 */
export async function notificarAutomatica({ muestra_id = null, cliente_id = null, tipo, asunto, mensaje }) {
  let correo = null;

  if (cliente_id) {
    const cliente = await Cliente.findOne({ _id: cliente_id, eliminado: false });
    correo = cliente?.email || null;
  }

  return Notificacion.create({
    muestra_id,
    cliente_id,
    tipo,
    asunto,
    mensaje,
    correo_destino: correo,
    estado: 'pendiente',
    fecha_programada: new Date()
  });
}

/** Crea una notificación manual (RF-112: remitente y plantillas simuladas). */
async function crearManual({ muestra_id, cliente_id, asunto, mensaje }, usuario) {
  let correo = null;

  if (cliente_id) {
    const cliente = await Cliente.findOne({ _id: cliente_id, eliminado: false });
    if (!cliente) throw httpError(404, 'Cliente no encontrado');
    correo = cliente.email;
  }

  const notificacion = await Notificacion.create({
    muestra_id: muestra_id || null,
    cliente_id: cliente_id || null,
    tipo: 'otro',
    asunto,
    mensaje,
    correo_destino: correo,
    estado: 'pendiente',
    fecha_programada: new Date()
  });

  return conRelaciones(notificacion);
}

/** Simula el resultado del envío: enviada o fallida (máx. 3 intentos). */
async function cambiarEstado(id, { estado, error }, usuario) {
  validarId(id);

  const notificacion = await Notificacion.findOne({ _id: id, eliminado: false });
  if (!notificacion) throw httpError(404, 'Notificación no encontrada');

  notificacion.intentos = Math.min(notificacion.intentos + 1, 3);
  notificacion.estado = estado;
  if (estado === 'enviada') {
    notificacion.fecha_envio = new Date();
    notificacion.error_ultimo_intento = null;
  } else {
    notificacion.error_ultimo_intento = error || 'Error simulado en el envío';
  }

  await notificacion.save();
  return conRelaciones(notificacion);
}

/** Reenvía una notificación fallida (RF-111), máximo 3 intentos. */
async function reenviar(id) {
  validarId(id);

  const notificacion = await Notificacion.findOne({ _id: id, eliminado: false });
  if (!notificacion) throw httpError(404, 'Notificación no encontrada');

  if (notificacion.intentos >= 3) throw httpError(400, 'La notificación ya alcanzó el máximo de 3 intentos');
  if (notificacion.estado === 'pendiente') throw httpError(400, 'La notificación aún está pendiente de envío');

  notificacion.estado = 'pendiente';
  notificacion.fecha_programada = new Date();
  await notificacion.save();

  return conRelaciones(notificacion);
}

export { TIPO_LABEL, listar, crearManual, cambiarEstado, reenviar };
