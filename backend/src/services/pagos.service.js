import mongoose from 'mongoose';
import Pago from '../models/Pago.js';
import Cotizacion from '../models/Cotizacion.js';
import Solicitud from '../models/Solicitud.js';
import { generarReferenciaPago } from './secuencias.service.js';
import { httpError } from '../utils/responses.js';

const ESTADOS = ['pendiente', 'confirmado', 'fallido'];

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Pago no encontrado');
}

function conRelaciones(pago) {
  return Pago.populate(pago, [
    {
      path: 'cotizacion_id',
      select: 'numero total estado',
      populate: {
        path: 'solicitud_id',
        select: 'descripcion',
        populate: { path: 'cliente_id', select: 'nombre' }
      }
    },
    { path: 'solicitud_id', select: 'descripcion' }
  ]);
}

async function listar({ q, estado }) {
  const filtro = { eliminado: false };

  if (estado) filtro.estado = estado;

  if (q) {
    const regex = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filtro.referencia = regex;
  }

  return Pago.find(filtro)
    .populate({
      path: 'cotizacion_id',
      select: 'numero total estado',
      populate: { path: 'solicitud_id', select: 'descripcion', populate: { path: 'cliente_id', select: 'nombre' } }
    })
    .sort({ fecha_creacion: -1 });
}

/**
 * Registra un pago SIMULADO (RNF-018) para una cotización aceptada (RF-010).
 */
async function crear({ cotizacion_id }) {
  validarId(cotizacion_id);

  const cotizacion = await Cotizacion.findOne({ _id: cotizacion_id, eliminado: false });
  if (!cotizacion) throw httpError(404, 'Cotización no encontrada');

  if (cotizacion.estado !== 'aceptada') {
    throw httpError(400, 'La cotización debe estar aceptada para registrar el pago');
  }

  const existente = await Pago.findOne({ cotizacion_id, eliminado: false, estado: { $in: ['pendiente', 'confirmado'] } });
  if (existente) throw httpError(409, 'Ya existe un pago para esta cotización');

  const pago = await Pago.create({
    cotizacion_id: cotizacion._id,
    solicitud_id: cotizacion.solicitud_id,
    referencia: await generarReferenciaPago(),
    monto: Number(cotizacion.total),
    metodo: 'simulado'
  });

  return conRelaciones(pago);
}

/**
 * Simula el resultado del pago (RF-011): confirmado o fallido. Al confirmar,
 * la solicitud pasa a "pagada".
 */
async function cambiarEstado(id, estado) {
  validarId(id);

  if (!['confirmado', 'fallido'].includes(estado)) throw httpError(400, 'Estado no válido');

  const pago = await Pago.findOne({ _id: id, eliminado: false });
  if (!pago) throw httpError(404, 'Pago no encontrado');

  pago.estado = estado;
  pago.fecha_confirmacion = estado === 'confirmado' ? new Date() : null;

  await pago.save();

  if (estado === 'confirmado') {
    await Solicitud.updateOne({ _id: pago.solicitud_id }, { $set: { estado: 'pagada' } });
  }

  return conRelaciones(pago);
}

export { listar, crear, cambiarEstado };
