import mongoose from 'mongoose';
import Factura from '../models/Factura.js';
import Pago from '../models/Pago.js';
import Solicitud from '../models/Solicitud.js';
import Cliente from '../models/Cliente.js';
import { generarNumeroFactura } from './secuencias.service.js';
import { emitirFacturaSandbox } from './factus/factusClient.js';
import { httpError } from '../utils/responses.js';

const ESTADOS = ['pendiente', 'generada', 'enviada', 'anulada', 'error'];

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Factura no encontrada');
}

function conRelaciones(factura) {
  return Factura.populate(factura, [
    {
      path: 'solicitud_id',
      select: 'descripcion estado',
      populate: { path: 'cliente_id', select: 'nombre email numero_documento' }
    },
    { path: 'pago_id', select: 'referencia monto estado' }
  ]);
}

async function listar({ q, estado }) {
  const filtro = { eliminado: false };

  if (estado) filtro.estado = estado;

  if (q) {
    const regex = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filtro.$or = [{ numero: regex }];
  }

  return Factura.find(filtro)
    .populate({
      path: 'solicitud_id',
      select: 'descripcion estado',
      populate: { path: 'cliente_id', select: 'nombre email numero_documento' }
    })
    .populate('pago_id', 'referencia monto estado')
    .sort({ fecha_creacion: -1 });
}

/**
 * Genera la factura desde un pago confirmado (RF-099/101/102/103).
 * Emite contra FACTUS SANDBOX (simulado) y guarda la respuesta en documento.
 */
async function generar(pagoId, usuario) {
  validarId(pagoId);

  const pago = await Pago.findOne({ _id: pagoId, eliminado: false });
  if (!pago) throw httpError(404, 'Pago no encontrado');

  if (pago.estado !== 'confirmado') {
    throw httpError(400, 'El pago debe estar confirmado para generar la factura');
  }

  const existente = await Factura.findOne({ pago_id: pago._id, eliminado: false });
  if (existente) throw httpError(409, 'Ya existe una factura para este pago');

  const solicitud = await Solicitud.findOne({ _id: pago.solicitud_id, eliminado: false });
  const cliente = solicitud ? await Cliente.findOne({ _id: solicitud.cliente_id, eliminado: false }) : null;

  const numero = await generarNumeroFactura();

  // RNF-017: solo sandbox. La respuesta simulada nunca se expone al cliente.
  const documento = await emitirFacturaSandbox({
    numero,
    valor_total: Number(pago.monto),
    cliente_nombre: cliente?.nombre || 'Cliente'
  });

  const factura = await Factura.create({
    solicitud_id: pago.solicitud_id,
    pago_id: pago._id,
    numero,
    valor_total: Number(pago.monto),
    estado: 'generada',
    documento,
    generado_por: usuario?.nombre || null,
    fecha_generacion: new Date(),
    historial: [{ estado: 'generada', usuario: usuario?.nombre || null, fecha: new Date() }]
  });

  return conRelaciones(factura);
}

/** Cambia el estado y deja el cambio en el historial (RF-104/106). */
async function cambiarEstado(id, { estado, motivo }, usuario) {
  validarId(id);

  const factura = await Factura.findOne({ _id: id, eliminado: false });
  if (!factura) throw httpError(404, 'Factura no encontrada');

  if (!['enviada', 'anulada', 'error'].includes(estado)) throw httpError(400, 'Estado no válido');

  factura.estado = estado;
  factura.historial.push({
    estado,
    usuario: usuario?.nombre || null,
    fecha: new Date(),
    motivo: motivo || ''
  });

  await factura.save();
  return conRelaciones(factura);
}

export { listar, generar, cambiarEstado };
