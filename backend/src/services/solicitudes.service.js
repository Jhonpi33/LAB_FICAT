import mongoose from 'mongoose';
import Solicitud from '../models/Solicitud.js';
import Cliente from '../models/Cliente.js';
import { httpError } from '../utils/responses.js';

const ESTADOS = ['pendiente', 'cotizada', 'aceptada', 'pagada', 'rechazada'];

function escapar(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Solicitud no encontrada');
}

function conCliente(solicitud) {
  return solicitud.populate('cliente_id', 'nombre numero_documento tipo_cliente');
}

async function listar({ q, estado }) {
  const filtro = { eliminado: false };

  if (estado) filtro.estado = estado;

  if (q) {
    const regex = new RegExp(escapar(q), 'i');
    filtro.$or = [{ descripcion: regex }];
  }

  return Solicitud.find(filtro).sort({ fecha_creacion: -1 }).populate('cliente_id', 'nombre numero_documento tipo_cliente');
}

async function crear(data) {
  validarId(data.cliente_id);

  const cliente = await Cliente.findOne({ _id: data.cliente_id, eliminado: false });
  if (!cliente) throw httpError(404, 'Cliente no encontrado');

  // RF-003: el tipo de cliente se deriva del cliente, no lo decide quien crea.
  const solicitud = await Solicitud.create({
    cliente_id: cliente._id,
    tipo_cliente: cliente.tipo_cliente,
    descripcion: data.descripcion,
    prioridad: data.prioridad || 'media',
    atencion_inmediata: Boolean(data.atencion_inmediata),
    motivo_atencion_inmediata: data.motivo_atencion_inmediata || '',
    requiere_pago: cliente.tipo_cliente === 'externo'
  });

  return conCliente(solicitud);
}

async function editar(id, data) {
  validarId(id);

  const solicitud = await Solicitud.findOne({ _id: id, eliminado: false });
  if (!solicitud) throw httpError(404, 'Solicitud no encontrada');

  solicitud.descripcion = data.descripcion;
  if (data.prioridad) solicitud.prioridad = data.prioridad;
  solicitud.atencion_inmediata = Boolean(data.atencion_inmediata);
  solicitud.motivo_atencion_inmediata = data.motivo_atencion_inmediata || '';

  await solicitud.save();
  return conCliente(solicitud);
}

async function cambiarEstado(id, estado) {
  validarId(id);

  if (!ESTADOS.includes(estado)) throw httpError(400, 'Estado no valido');

  const solicitud = await Solicitud.findOne({ _id: id, eliminado: false });
  if (!solicitud) throw httpError(404, 'Solicitud no encontrada');

  solicitud.estado = estado;
  await solicitud.save();
  return conCliente(solicitud);
}

export { listar, crear, editar, cambiarEstado };
