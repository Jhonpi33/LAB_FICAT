const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
const config = require('../config/env');
const { httpError } = require('../utils/responses');

function datosPublicos(u) {
  return {
    id: u._id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    activo: u.activo,
    permiso_editar: u.permiso_editar,
    permiso_eliminar: u.permiso_eliminar,
    fecha_creacion: u.fecha_creacion
  };
}

async function registro({ nombre, email, password }) {
  const existe = await Usuario.findOne({ email });
  if (existe) throw httpError(409, 'El email ya se encuentra registrado');

  const usuario = await Usuario.create({ nombre, email, password, rol: 'usuario' });
  return datosPublicos(usuario);
}

async function login(email, password) {
  const usuario = await Usuario.findOne({ email }).select('+password');

  if (!usuario) throw httpError(401, 'Credenciales incorrectas');

  const coincide = await usuario.compararPassword(password);
  if (!coincide) throw httpError(401, 'Credenciales incorrectas');

  if (usuario.eliminado) throw httpError(404, 'La cuenta no existe');
  if (!usuario.activo) throw httpError(403, 'La cuenta esta desactivada, contacte al administrador');

  const token = jwt.sign(
    {
      id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      permiso_editar: usuario.permiso_editar,
      permiso_eliminar: usuario.permiso_eliminar
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES }
  );

  return { token, usuario: datosPublicos(usuario) };
}

async function me(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Usuario no encontrado');

  const usuario = await Usuario.findOne({ _id: id, eliminado: false });
  if (!usuario) throw httpError(404, 'Usuario no encontrado');

  return datosPublicos(usuario);
}

async function actualizarPerfil(id, data) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Usuario no encontrado');

  const usuario = await Usuario.findOne({ _id: id, eliminado: false }).select('+password');
  if (!usuario) throw httpError(404, 'Usuario no encontrado');

  const email = String(data.email).toLowerCase();
  const otro = await Usuario.findOne({ email, _id: { $ne: id } });
  if (otro) throw httpError(409, 'El email ya se encuentra registrado');

  usuario.nombre = data.nombre;
  usuario.email = email;
  if (data.password) usuario.password = data.password;

  await usuario.save();
  return datosPublicos(usuario);
}

module.exports = { registro, login, me, actualizarPerfil };
