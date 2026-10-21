const crypto = require('crypto');
const mongoose = require('mongoose');
const Muestra = require('../models/Muestra');
const Solicitud = require('../models/Solicitud');
const ParametroAnalisis = require('../models/ParametroAnalisis');
const { httpError } = require('../utils/responses');

// Transiciones permitidas del estado de la muestra
const TRANSICIONES = {
  pendiente: ['aceptada', 'rechazada'],
  aceptada: ['en_analisis'],
  rechazada: [],
  en_analisis: ['finalizada'],
  finalizada: []
};

const CAMPOS_SOLICITUD = 'estado prioridad fecha_creacion';
const CAMPOS_CLIENTE = 'nombre tipo_cliente numero_documento';
const CAMPOS_PARAMETROS = 'nombre precio unidad';

function escapar(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Muestra no encontrada');
}

function validarFiltroId(valor, mensaje) {
  if (valor && !mongoose.Types.ObjectId.isValid(valor)) throw httpError(400, mensaje);
}

function poblar(query) {
  return query
    .populate('solicitud', CAMPOS_SOLICITUD)
    .populate('cliente', CAMPOS_CLIENTE)
    .populate('parametros', CAMPOS_PARAMETROS);
}

// Codigo consecutivo por anio con formato '0042-2026' (RF-026).
async function generarCodigo() {
  const anio = new Date().getFullYear();
  const ultima = await Muestra.findOne({ codigo: new RegExp(`^\\d{4}-${anio}$`) })
    .sort({ codigo: -1 })
    .select('codigo');
  const siguiente = ultima ? parseInt(String(ultima.codigo).slice(0, 4), 10) + 1 : 1;
  return `${String(siguiente).padStart(4, '0')}-${anio}`;
}

// Guarda reintentando si el indice unico de codigo choca con una muestra concurrente.
async function guardar(muestra) {
  for (let intento = 0; intento < 5; intento++) {
    try {
      await muestra.save();
      return;
    } catch (err) {
      if (err.code === 11000 && muestra.estado === 'aceptada') {
        muestra.codigo = await generarCodigo();
        muestra.codigo_seguimiento = crypto.randomBytes(16).toString('hex');
        continue;
      }
      throw err;
    }
  }
  throw httpError(409, 'No fue posible generar un codigo unico para la muestra');
}

async function validarParametros(parametros) {
  if (!parametros || parametros.length === 0) return [];

  const ids = [...new Set(parametros.map(String))];
  const encontrados = await ParametroAnalisis.countDocuments({
    _id: { $in: ids },
    eliminado: false
  });

  if (encontrados !== ids.length) {
    throw httpError(400, 'Uno o mas parametros de analisis no son validos');
  }

  return ids;
}

async function listar({ q, estado, solicitud, cliente }) {
  const filtro = { eliminado: false };

  validarFiltroId(solicitud, 'La solicitud no es valida');
  validarFiltroId(cliente, 'El cliente no es valido');

  if (solicitud) filtro.solicitud = solicitud;
  if (cliente) filtro.cliente = cliente;
  if (estado) filtro.estado = estado;

  if (q) {
    const regex = new RegExp(escapar(q), 'i');
    filtro.$or = [{ codigo: regex }, { codigo_seguimiento: regex }, { nombre_muestra: regex }];
  }

  const muestras = await poblar(Muestra.find(filtro))
    .select('-__v')
    .sort({ fecha_recepcion: -1 });

  return muestras;
}

async function obtener(id) {
  validarId(id);

  const muestra = await poblar(Muestra.findOne({ _id: id, eliminado: false })).select('-__v');
  if (!muestra) throw httpError(404, 'Muestra no encontrada');

  return muestra.toObject({ versionKey: false });
}

async function crear(data) {
  const solicitud = await Solicitud.findOne({ _id: data.solicitud, eliminado: false });
  if (!solicitud) throw httpError(404, 'Solicitud no encontrada');

  if (data.cliente && String(data.cliente) !== String(solicitud.cliente)) {
    throw httpError(400, 'El cliente no coincide con el cliente de la solicitud');
  }

  const parametros = await validarParametros(data.parametros);

  const muestra = await Muestra.create({
    solicitud: solicitud._id,
    cliente: solicitud.cliente,
    nombre_muestra: data.nombre_muestra,
    descripcion: data.descripcion,
    tipo_fisico: data.tipo_fisico,
    cantidad: Number(data.cantidad),
    unidad: data.unidad,
    parametros,
    ubicacion: data.ubicacion || '',
    estado: 'pendiente'
  });

  return obtener(muestra._id);
}

async function editar(id, data) {
  validarId(id);

  const muestra = await Muestra.findOne({ _id: id, eliminado: false });
  if (!muestra) throw httpError(404, 'Muestra no encontrada');

  const solicitud = await Solicitud.findOne({ _id: data.solicitud, eliminado: false });
  if (!solicitud) throw httpError(404, 'Solicitud no encontrada');

  if (data.cliente && String(data.cliente) !== String(solicitud.cliente)) {
    throw httpError(400, 'El cliente no coincide con el cliente de la solicitud');
  }

  const parametros = await validarParametros(data.parametros);

  muestra.solicitud = solicitud._id;
  muestra.cliente = solicitud.cliente;
  muestra.nombre_muestra = data.nombre_muestra;
  muestra.descripcion = data.descripcion;
  muestra.tipo_fisico = data.tipo_fisico;
  muestra.cantidad = Number(data.cantidad);
  muestra.unidad = data.unidad;
  muestra.parametros = parametros;
  muestra.ubicacion = data.ubicacion || '';

  await guardar(muestra);
  return obtener(muestra._id);
}

async function cambiarEstado(id, estado, motivoRechazo) {
  validarId(id);

  const muestra = await Muestra.findOne({ _id: id, eliminado: false });
  if (!muestra) throw httpError(404, 'Muestra no encontrada');

  const permitidos = TRANSICIONES[muestra.estado] || [];
  if (!permitidos.includes(estado)) {
    throw httpError(400, `Transicion de estado no permitida: de "${muestra.estado}" a "${estado}"`);
  }

  if (estado === 'rechazada') {
    muestra.motivo_rechazo = String(motivoRechazo || '').trim();
  }

  // Al aceptar se genera el codigo consecutivo y el codigo de seguimiento (RF-026 a RF-028).
  if (estado === 'aceptada' && !muestra.codigo) {
    muestra.codigo = await generarCodigo();
    muestra.codigo_seguimiento = crypto.randomBytes(16).toString('hex');
  }

  muestra.estado = estado;
  await guardar(muestra);
  return obtener(muestra._id);
}

async function eliminar(id, idUsuario) {
  validarId(id);

  const muestra = await Muestra.findOne({ _id: id, eliminado: false });
  if (!muestra) throw httpError(404, 'Muestra no encontrada');
  if (muestra.estado !== 'pendiente') {
    throw httpError(409, 'Solo se pueden eliminar muestras pendientes');
  }

  muestra.eliminado = true;
  muestra.eliminado_por = idUsuario || null;
  muestra.fecha_eliminacion = new Date();

  await guardar(muestra);
  return obtener(muestra._id);
}

module.exports = { listar, obtener, crear, editar, cambiarEstado, eliminar };
