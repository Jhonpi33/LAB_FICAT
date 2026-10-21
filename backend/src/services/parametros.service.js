const mongoose = require('mongoose');
const ParametroAnalisis = require('../models/ParametroAnalisis');
const Cotizacion = require('../models/Cotizacion');
const { httpError } = require('../utils/responses');

function escapar(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Parametro de analisis no encontrado');
}

async function listar({ q, activo }) {
  const filtro = { eliminado: false };

  if (activo !== undefined && activo !== '') {
    filtro.activo = activo === 'true';
  }

  if (q) {
    const regex = new RegExp(escapar(q), 'i');
    filtro.$or = [{ nombre: regex }, { descripcion: regex }];
  }

  const parametros = await ParametroAnalisis.find(filtro)
    .select('-__v')
    .sort({ nombre: 1 });

  return parametros;
}

async function obtener(id) {
  validarId(id);

  const parametro = await ParametroAnalisis.findOne({ _id: id, eliminado: false }).select('-__v');
  if (!parametro) throw httpError(404, 'Parametro de analisis no encontrado');

  return parametro.toObject({ versionKey: false });
}

async function crear(data) {
  const nombre = String(data.nombre).trim();
  const existe = await ParametroAnalisis.findOne({ nombre });
  if (existe) throw httpError(409, 'El nombre del parametro ya se encuentra registrado');

  const parametro = await ParametroAnalisis.create({
    nombre,
    descripcion: data.descripcion,
    precio: Number(data.precio),
    unidad: data.unidad || '',
    activo: data.activo === undefined ? true : data.activo
  });

  return parametro.toObject({ versionKey: false });
}

async function editar(id, data) {
  validarId(id);

  const parametro = await ParametroAnalisis.findOne({ _id: id, eliminado: false });
  if (!parametro) throw httpError(404, 'Parametro de analisis no encontrado');

  const nombre = String(data.nombre).trim();
  const otro = await ParametroAnalisis.findOne({ nombre, _id: { $ne: id } });
  if (otro) throw httpError(409, 'El nombre del parametro ya se encuentra registrado');

  parametro.nombre = nombre;
  parametro.descripcion = data.descripcion;
  parametro.precio = Number(data.precio);
  parametro.unidad = data.unidad || '';
  if (data.activo !== undefined) parametro.activo = data.activo;

  await parametro.save();
  return parametro.toObject({ versionKey: false });
}

async function cambiarEstado(id, activo) {
  validarId(id);

  const parametro = await ParametroAnalisis.findOne({ _id: id, eliminado: false });
  if (!parametro) throw httpError(404, 'Parametro de analisis no encontrado');

  parametro.activo = activo;
  await parametro.save();

  return parametro.toObject({ versionKey: false });
}

async function eliminar(id, idUsuario) {
  validarId(id);

  const parametro = await ParametroAnalisis.findOne({ _id: id, eliminado: false });
  if (!parametro) throw httpError(404, 'Parametro de analisis no encontrado');

  const enUso = await Cotizacion.exists({ 'items.parametro': id, eliminado: false });
  if (enUso) throw httpError(409, 'No se puede eliminar un parametro utilizado en cotizaciones');

  parametro.eliminado = true;
  parametro.eliminado_por = idUsuario || null;
  parametro.fecha_eliminacion = new Date();

  await parametro.save();
  return parametro.toObject({ versionKey: false });
}

module.exports = { listar, obtener, crear, editar, cambiarEstado, eliminar };
