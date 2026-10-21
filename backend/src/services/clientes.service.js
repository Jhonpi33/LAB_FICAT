const mongoose = require('mongoose');
const Cliente = require('../models/Cliente');
const Solicitud = require('../models/Solicitud');
const { httpError } = require('../utils/responses');

function escapar(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Cliente no encontrado');
}

async function listar({ q, tipo }) {
  const filtro = { eliminado: false };

  if (tipo) {
    filtro.tipo_cliente = tipo;
  }

  if (q) {
    const regex = new RegExp(escapar(q), 'i');
    filtro.$or = [{ nombre: regex }, { email: regex }, { numero_documento: regex }];
  }

  const clientes = await Cliente.find(filtro)
    .select('-__v')
    .sort({ fecha_creacion: -1 });

  return clientes;
}

async function obtener(id) {
  validarId(id);

  const cliente = await Cliente.findOne({ _id: id, eliminado: false }).select('-__v');
  if (!cliente) throw httpError(404, 'Cliente no encontrado');

  return cliente.toObject({ versionKey: false });
}

async function crear(data) {
  const numero_documento = String(data.numero_documento).trim();
  const existe = await Cliente.findOne({ numero_documento });
  if (existe) throw httpError(409, 'El numero de documento ya se encuentra registrado');

  const cliente = await Cliente.create({
    nombre: data.nombre,
    tipo_documento: data.tipo_documento || 'CC',
    numero_documento,
    email: String(data.email).toLowerCase(),
    telefono: data.telefono || '',
    direccion: data.direccion || '',
    tipo_cliente: data.tipo_cliente
  });

  return cliente.toObject({ versionKey: false });
}

async function editar(id, data) {
  validarId(id);

  const cliente = await Cliente.findOne({ _id: id, eliminado: false });
  if (!cliente) throw httpError(404, 'Cliente no encontrado');

  const numero_documento = String(data.numero_documento).trim();
  const otro = await Cliente.findOne({ numero_documento, _id: { $ne: id } });
  if (otro) throw httpError(409, 'El numero de documento ya se encuentra registrado');

  cliente.nombre = data.nombre;
  cliente.tipo_documento = data.tipo_documento || 'CC';
  cliente.numero_documento = numero_documento;
  cliente.email = String(data.email).toLowerCase();
  cliente.telefono = data.telefono || '';
  cliente.direccion = data.direccion || '';
  cliente.tipo_cliente = data.tipo_cliente;

  await cliente.save();
  return cliente.toObject({ versionKey: false });
}

async function eliminar(id, idUsuario) {
  validarId(id);

  const cliente = await Cliente.findOne({ _id: id, eliminado: false });
  if (!cliente) throw httpError(404, 'Cliente no encontrado');

  const enUso = await Solicitud.exists({ cliente: id, eliminado: false });
  if (enUso) throw httpError(409, 'No se puede eliminar un cliente con solicitudes registradas');

  cliente.eliminado = true;
  cliente.eliminado_por = idUsuario || null;
  cliente.fecha_eliminacion = new Date();

  await cliente.save();
  return cliente.toObject({ versionKey: false });
}

module.exports = { listar, obtener, crear, editar, eliminar };
