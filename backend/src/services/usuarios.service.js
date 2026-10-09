const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
const { httpError } = require('../utils/responses');

function escapar(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Usuario no encontrado');
}

async function listar({ rol, q }) {
  const filtro = { eliminado: false };

  if (rol) {
    filtro.rol = rol;
  }

  if (q) {
    const regex = new RegExp(escapar(q), 'i');
    filtro.$or = [{ nombre: regex }, { email: regex }];
  }

  const usuarios = await Usuario.find(filtro)
    .select('-password')
    .sort({ fecha_creacion: -1 });

  return usuarios;
}

async function crear(data) {
  if (data.rol && data.rol !== 'encargado') {
    throw httpError(400, 'Solo se pueden crear encargados');
  }

  const email = String(data.email).toLowerCase();
  const existe = await Usuario.findOne({ email });
  if (existe) throw httpError(409, 'El email ya se encuentra registrado');

  const usuario = await Usuario.create({
    nombre: data.nombre,
    email,
    password: data.password,
    rol: 'encargado',
    activo: true,
    permiso_editar: false,
    permiso_eliminar: false
  });

  return usuario.toObject({ versionKey: false });
}

async function editar(id, data) {
  validarId(id);

  const usuario = await Usuario.findOne({ _id: id, eliminado: false }).select('+password');
  if (!usuario) throw httpError(404, 'Usuario no encontrado');

  const email = String(data.email).toLowerCase();
  const otro = await Usuario.findOne({ email, _id: { $ne: id } });
  if (otro) throw httpError(409, 'El email ya se encuentra registrado');

  usuario.nombre = data.nombre;
  usuario.email = email;
  if (data.rol) usuario.rol = data.rol;
  if (data.password) usuario.password = data.password;

  await usuario.save();
  return { ...usuario.toObject({ versionKey: false }), password: undefined };
}

async function cambiarEstado(id, activo, idSolicitante) {
  validarId(id);

  if (String(id) === String(idSolicitante) && !activo) {
    throw httpError(400, 'No puede desactivar su propia cuenta');
  }

  const usuario = await Usuario.findOne({ _id: id, eliminado: false });
  if (!usuario) throw httpError(404, 'Usuario no encontrado');

  usuario.activo = activo;
  await usuario.save();

  return { id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, activo: usuario.activo };
}

module.exports = { listar, crear, editar, cambiarEstado };
