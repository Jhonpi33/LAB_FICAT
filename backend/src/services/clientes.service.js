import mongoose from 'mongoose';
import Cliente from '../models/Cliente.js';
import { httpError } from '../utils/responses.js';

function escapar(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Cliente no encontrado');
}

async function listar({ q, tipo_cliente }) {
  const filtro = { eliminado: false };

  if (tipo_cliente) filtro.tipo_cliente = tipo_cliente;

  if (q) {
    const regex = new RegExp(escapar(q), 'i');
    filtro.$or = [{ nombre: regex }, { numero_documento: regex }, { email: regex }];
  }

  return Cliente.find(filtro).sort({ fecha_creacion: -1 });
}

async function crear(data) {
  const numero_documento = String(data.numero_documento).trim();
  const existe = await Cliente.findOne({ numero_documento, eliminado: false });
  if (existe) throw httpError(409, 'Ya existe un cliente con ese numero de documento');

  return Cliente.create({
    nombre: data.nombre,
    tipo_documento: data.tipo_documento,
    numero_documento,
    email: String(data.email).toLowerCase(),
    telefono: data.telefono || '',
    direccion: data.direccion || '',
    tipo_cliente: data.tipo_cliente
  });
}

async function editar(id, data) {
  validarId(id);

  const cliente = await Cliente.findOne({ _id: id, eliminado: false });
  if (!cliente) throw httpError(404, 'Cliente no encontrado');

  const numero_documento = String(data.numero_documento).trim();
  const otro = await Cliente.findOne({ numero_documento, eliminado: false, _id: { $ne: id } });
  if (otro) throw httpError(409, 'Ya existe un cliente con ese numero de documento');

  cliente.nombre = data.nombre;
  cliente.tipo_documento = data.tipo_documento;
  cliente.numero_documento = numero_documento;
  cliente.email = String(data.email).toLowerCase();
  cliente.telefono = data.telefono || '';
  cliente.direccion = data.direccion || '';
  cliente.tipo_cliente = data.tipo_cliente;

  await cliente.save();
  return cliente;
}

export { listar, crear, editar };
