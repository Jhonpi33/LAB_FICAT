import mongoose from 'mongoose';
import Incidencia from '../models/Incidencia.js';
import Muestra from '../models/Muestra.js';
import { registrarEvento } from './eventos.service.js';
import { notificarAutomatica } from './notificaciones.service.js';
import { httpError } from '../utils/responses.js';

const ESTADOS = ['abierta', 'en_revision', 'esperando_cliente', 'aprobada', 'cerrada'];

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Incidencia no encontrada');
}

function conRelaciones(incidencia) {
  return Incidencia.populate(incidencia, [
    { path: 'muestra_id', select: 'codigo nombre_muestra cliente_id', populate: { path: 'cliente_id', select: 'nombre' } }
  ]);
}

async function listar({ q, muestra_id, estado }) {
  const filtro = { eliminado: false };

  if (muestra_id) filtro.muestra_id = muestra_id;
  if (estado) filtro.estado = estado;

  return Incidencia.find(filtro)
    .populate({ path: 'muestra_id', select: 'codigo nombre_muestra cliente_id', populate: { path: 'cliente_id', select: 'nombre' } })
    .sort({ fecha_creacion: -1 });
}

/**
 * Crea la incidencia (RF-063 a RF-068).
 * Si es visible al cliente y requiere respuesta, queda "esperando_cliente".
 * Si es una demora, se registra evento público de cambio de fecha (RF-080).
 */
async function crear(data, usuario) {
  validarId(data.muestra_id);

  const muestra = await Muestra.findOne({ _id: data.muestra_id, eliminado: false });
  if (!muestra) throw httpError(404, 'Muestra no encontrada');

  const estadoInicial = data.requiere_respuesta && data.visible_cliente ? 'esperando_cliente' : 'abierta';

  const incidencia = await Incidencia.create({
    muestra_id: muestra._id,
    tipo: data.tipo,
    titulo: data.titulo,
    descripcion: data.descripcion,
    observaciones_internas: data.observaciones_internas || '',
    visible_cliente: Boolean(data.visible_cliente),
    requiere_respuesta: Boolean(data.requiere_respuesta),
    estado: estadoInicial,
    nueva_fecha_estimada: data.nueva_fecha_estimada || null,
    creada_por: usuario?.nombre || null
  });

  if (data.tipo === 'demora' && data.nueva_fecha_estimada) {
    await registrarEvento({
      muestra_id: muestra._id,
      tipo_evento: 'cambio_fecha',
      descripcion: `Nueva fecha estimada: ${new Date(data.nueva_fecha_estimada).toLocaleDateString('es-CO')}`,
      visible_cliente: true,
      usuario_id: usuario?.id || null
    });
  } else {
    await registrarEvento({
      muestra_id: muestra._id,
      tipo_evento: 'observacion',
      descripcion: `${data.titulo}: ${data.descripcion}`,
      visible_cliente: Boolean(data.visible_cliente),
      usuario_id: usuario?.id || null
    });
  }

  // RF-108/110: notificación automática si la incidencia es visible al cliente.
  if (data.visible_cliente) {
    await notificarAutomatica({
      muestra_id: muestra._id,
      cliente_id: muestra.cliente_id,
      tipo: data.tipo === 'demora' ? 'cambio_fecha' : 'incidencia',
      asunto: `Novedad en tu muestra ${muestra.codigo}: ${data.titulo}`,
      mensaje: data.descripcion
    });
  }

  return conRelaciones(incidencia);
}

/** Cambia el estado de la incidencia (RF-071/072/073). */
async function cambiarEstado(id, { estado, motivo }, usuario) {
  validarId(id);

  if (!ESTADOS.includes(estado)) throw httpError(400, 'Estado no válido');

  const incidencia = await Incidencia.findOne({ _id: id, eliminado: false });
  if (!incidencia) throw httpError(404, 'Incidencia no encontrada');

  incidencia.estado = estado;
  incidencia.revisada_por = usuario?.nombre || null;
  if (estado === 'cerrada') {
    incidencia.fecha_cierre = new Date();
    incidencia.motivo = motivo || '';
  }

  incidencia.acciones.push({
    tipo: `cambio_estado:${estado}`,
    usuario: usuario?.nombre || null,
    fecha: new Date(),
    comentario: motivo || ''
  });

  await incidencia.save();
  return conRelaciones(incidencia);
}

/**
 * Registra la respuesta del CLIENTE desde el seguimiento público (RF-069/070).
 * La incidencia pasa a "en_revision" para que el personal la revise.
 */
async function responderCliente(id, mensaje) {
  validarId(id);

  const incidencia = await Incidencia.findOne({ _id: id, eliminado: false, visible_cliente: true });
  if (!incidencia) throw httpError(404, 'Incidencia no encontrada');

  if (incidencia.estado !== 'esperando_cliente') {
    throw httpError(400, 'Esta solicitud de información ya fue respondida');
  }

  incidencia.respuestas.push({
    tipo_usuario: 'cliente',
    mensaje: String(mensaje).trim(),
    fecha: new Date()
  });
  incidencia.estado = 'en_revision';

  await incidencia.save();
  return conRelaciones(incidencia);
}

export { listar, crear, cambiarEstado, responderCliente };
