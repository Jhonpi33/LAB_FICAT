import mongoose from 'mongoose';
import Cotizacion from '../models/Cotizacion.js';
import Solicitud from '../models/Solicitud.js';
import ParametroAnalisis from '../models/ParametroAnalisis.js';
import { generarNumeroCotizacion } from './secuencias.service.js';
import { httpError } from '../utils/responses.js';

const ESTADOS = ['borrador', 'enviada', 'envio_fallido', 'aceptada', 'rechazada'];

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Cotización no encontrada');
}

function conRelaciones(cotizacion) {
  return Cotizacion.populate(cotizacion, [
    {
      path: 'solicitud_id',
      select: 'descripcion estado tipo_cliente',
      populate: { path: 'cliente_id', select: 'nombre numero_documento' }
    },
    { path: 'items.parametro_id', select: 'nombre unidad' }
  ]);
}

async function listar({ q, estado }) {
  const filtro = { eliminado: false };

  if (estado) filtro.estado = estado;

  if (q) {
    // Búsqueda por número de cotización.
    const numero = Number(q);
    filtro.numero = Number.isNaN(numero) ? -1 : numero;
  }

  return Cotizacion.find(filtro)
    .populate({
      path: 'solicitud_id',
      select: 'descripcion estado tipo_cliente',
      populate: { path: 'cliente_id', select: 'nombre numero_documento' }
    })
    .populate('items.parametro_id', 'nombre unidad')
    .sort({ fecha_creacion: -1 });
}

/**
 * Crea la cotización a partir de la solicitud y sus ítems de parámetros
 * (RF-006). Calcula subtotales y total con el precio vigente de cada parámetro,
 * y deja la solicitud en estado "cotizada".
 */
async function crear({ solicitud_id, items }) {
  validarId(solicitud_id);

  const solicitud = await Solicitud.findOne({ _id: solicitud_id, eliminado: false });
  if (!solicitud) throw httpError(404, 'Solicitud no encontrada');

  if (!Array.isArray(items) || items.length === 0) {
    throw httpError(400, 'Debe incluir al menos un parámetro');
  }

  const lineas = [];
  for (const item of items) {
    const parametro = await ParametroAnalisis.findOne({ _id: item.parametro_id, eliminado: false });
    if (!parametro) throw httpError(404, 'Parámetro no encontrado');

    const cantidad = Number(item.cantidad);
    const precio = Number(parametro.precio);

    lineas.push({
      parametro_id: parametro._id,
      descripcion: parametro.nombre,
      cantidad,
      precio_unitario: precio,
      subtotal: cantidad * precio
    });
  }

  const subtotal = lineas.reduce((acc, linea) => acc + linea.subtotal, 0);
  const numero = await generarNumeroCotizacion();

  const cotizacion = await Cotizacion.create({
    solicitud_id: solicitud._id,
    numero,
    subtotal,
    total: subtotal,
    items: lineas
  });

  solicitud.estado = 'cotizada';
  await solicitud.save();

  return conRelaciones(cotizacion);
}

/**
 * Cambia el estado de la cotización. Al aceptarla, la solicitud pasa a
 * "aceptada" (RF-008).
 */
async function cambiarEstado(id, estado) {
  validarId(id);

  if (!ESTADOS.includes(estado)) throw httpError(400, 'Estado no válido');

  const cotizacion = await Cotizacion.findOne({ _id: id, eliminado: false });
  if (!cotizacion) throw httpError(404, 'Cotización no encontrada');

  cotizacion.estado = estado;
  if (estado === 'enviada') cotizacion.enviada_por_correo = true;

  await cotizacion.save();

  if (estado === 'aceptada') {
    await Solicitud.updateOne({ _id: cotizacion.solicitud_id }, { $set: { estado: 'aceptada' } });
  }

  return conRelaciones(cotizacion);
}

export { listar, crear, cambiarEstado };
