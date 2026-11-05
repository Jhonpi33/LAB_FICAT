import mongoose from 'mongoose';
import Disposicion from '../models/Disposicion.js';
import Muestra from '../models/Muestra.js';
import { registrarEvento } from './eventos.service.js';
import { notificarAutomatica } from './notificaciones.service.js';
import { httpError } from '../utils/responses.js';

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Disposición no encontrada');
}

function conRelaciones(disposicion) {
  return Disposicion.populate(disposicion, [
    { path: 'muestra_id', select: 'codigo nombre_muestra cliente_id', populate: { path: 'cliente_id', select: 'nombre email' } }
  ]);
}

async function listar({ q }) {
  const filtro = { eliminado: false };

  return Disposicion.find(filtro)
    .populate({ path: 'muestra_id', select: 'codigo nombre_muestra cliente_id', populate: { path: 'cliente_id', select: 'nombre email' } })
    .sort({ fecha_salida: -1 });
}

/**
 * Registra la salida final de la muestra (RF-086 a RF-093):
 * devolución al cliente o desecho. Actualiza el estado de la muestra, deja
 * evento público de cierre y, si se pide, notifica al cliente (RF-093).
 */
async function crear({ muestra_id, tipo, motivo, observacion, notificacion_cliente }, usuario) {
  validarId(muestra_id);

  const muestra = await Muestra.findOne({ _id: muestra_id, eliminado: false });
  if (!muestra) throw httpError(404, 'Muestra no encontrada');

  const existente = await Disposicion.findOne({ muestra_id: muestra._id, eliminado: false });
  if (existente) throw httpError(409, 'La muestra ya tiene una disposición registrada');

  const disposicion = await Disposicion.create({
    muestra_id: muestra._id,
    tipo,
    motivo,
    observacion: observacion || '',
    fecha_salida: new Date(),
    notificacion_cliente: Boolean(notificacion_cliente),
    realizada_por: usuario?.nombre || null
  });

  muestra.estado = tipo === 'devolucion' ? 'devuelta' : 'desechada';
  muestra.pendiente_disposicion = false;
  await muestra.save();

  await registrarEvento({
    muestra_id: muestra._id,
    tipo_evento: 'cierre',
    descripcion: `Muestra ${tipo === 'devolucion' ? 'devuelta al cliente' : 'desechada'}: ${motivo}`,
    visible_cliente: true,
    usuario_id: usuario?.id || null
  });

  if (notificacion_cliente) {
    await notificarAutomatica({
      muestra_id: muestra._id,
      cliente_id: muestra.cliente_id,
      tipo: 'conservacion',
      asunto: `Disposición final de tu muestra ${muestra.codigo}`,
      mensaje: `Tu muestra fue ${tipo === 'devolucion' ? 'devuelta' : 'desechada'}. Motivo: ${motivo}`
    });
  }

  return conRelaciones(disposicion);
}

export { listar, crear };
