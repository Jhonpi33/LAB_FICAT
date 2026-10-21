const mongoose = require('mongoose');
const Solicitud = require('../models/Solicitud');
const Cliente = require('../models/Cliente');
const Cotizacion = require('../models/Cotizacion');
const Muestra = require('../models/Muestra');
const { httpError } = require('../utils/responses');

// Transiciones permitidas del estado de la solicitud
const TRANSICIONES = {
  borrador: ['enviada'],
  enviada: ['aprobada'],
  aprobada: []
};

const CAMPOS_CLIENTE = 'nombre tipo_cliente numero_documento email';

function escapar(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Solicitud no encontrada');
}

function validarFiltroId(valor, mensaje) {
  if (valor && !mongoose.Types.ObjectId.isValid(valor)) throw httpError(400, mensaje);
}

async function listar({ q, cliente, estado, prioridad }) {
  const filtro = { eliminado: false };

  validarFiltroId(cliente, 'El cliente no es valido');

  if (cliente) filtro.cliente = cliente;
  if (estado) filtro.estado = estado;
  if (prioridad) filtro.prioridad = prioridad;

  if (q) {
    const regex = new RegExp(escapar(q), 'i');
    filtro.$or = [{ descripcion: regex }];
  }

  const solicitudes = await Solicitud.find(filtro)
    .select('-__v')
    .populate('cliente', CAMPOS_CLIENTE)
    .sort({ fecha_creacion: -1 });

  return solicitudes;
}

async function obtener(id) {
  validarId(id);

  const solicitud = await Solicitud.findOne({ _id: id, eliminado: false })
    .select('-__v')
    .populate('cliente', CAMPOS_CLIENTE);

  if (!solicitud) throw httpError(404, 'Solicitud no encontrada');

  return solicitud.toObject({ versionKey: false });
}

async function crear(data) {
  const cliente = await Cliente.findOne({ _id: data.cliente, eliminado: false });
  if (!cliente) throw httpError(404, 'Cliente no encontrado');

  const solicitud = await Solicitud.create({
    cliente: cliente._id,
    tipo_cliente: cliente.tipo_cliente,
    descripcion: data.descripcion,
    prioridad: data.prioridad || 'media',
    atencion_inmediata: Boolean(data.atencion_inmediata),
    motivo_atencion_inmediata: data.motivo_atencion_inmediata || '',
    estado: 'borrador'
  });

  await solicitud.populate('cliente', CAMPOS_CLIENTE);
  return solicitud.toObject({ versionKey: false });
}

async function editar(id, data) {
  validarId(id);

  const solicitud = await Solicitud.findOne({ _id: id, eliminado: false });
  if (!solicitud) throw httpError(404, 'Solicitud no encontrada');

  const cliente = await Cliente.findOne({ _id: data.cliente, eliminado: false });
  if (!cliente) throw httpError(404, 'Cliente no encontrado');

  solicitud.cliente = cliente._id;
  solicitud.tipo_cliente = cliente.tipo_cliente;
  solicitud.descripcion = data.descripcion;
  solicitud.prioridad = data.prioridad || 'media';
  solicitud.atencion_inmediata = Boolean(data.atencion_inmediata);
  solicitud.motivo_atencion_inmediata = data.motivo_atencion_inmediata || '';

  await solicitud.save();
  await solicitud.populate('cliente', CAMPOS_CLIENTE);
  return solicitud.toObject({ versionKey: false });
}

async function cambiarEstado(id, estado) {
  validarId(id);

  const solicitud = await Solicitud.findOne({ _id: id, eliminado: false });
  if (!solicitud) throw httpError(404, 'Solicitud no encontrada');

  const permitidos = TRANSICIONES[solicitud.estado] || [];
  if (!permitidos.includes(estado)) {
    throw httpError(400, `Transicion de estado no permitida: de "${solicitud.estado}" a "${estado}"`);
  }

  solicitud.estado = estado;
  await solicitud.save();
  await solicitud.populate('cliente', CAMPOS_CLIENTE);
  return solicitud.toObject({ versionKey: false });
}

async function eliminar(id, idUsuario) {
  validarId(id);

  const solicitud = await Solicitud.findOne({ _id: id, eliminado: false });
  if (!solicitud) throw httpError(404, 'Solicitud no encontrada');

  const enCotizacion = await Cotizacion.exists({ solicitud: id, eliminado: false });
  const enMuestra = await Muestra.exists({ solicitud: id, eliminado: false });

  if (enCotizacion || enMuestra) {
    throw httpError(409, 'No se puede eliminar una solicitud con cotizaciones o muestras registradas');
  }

  solicitud.eliminado = true;
  solicitud.eliminado_por = idUsuario || null;
  solicitud.fecha_eliminacion = new Date();

  await solicitud.save();
  await solicitud.populate('cliente', CAMPOS_CLIENTE);
  return solicitud.toObject({ versionKey: false });
}

module.exports = { listar, obtener, crear, editar, cambiarEstado, eliminar };
