import mongoose from 'mongoose';
import ParametroAnalisis from '../models/ParametroAnalisis.js';
import { httpError } from '../utils/responses.js';

function escapar(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Parametro no encontrado');
}

async function listar({ q, soloActivos }) {
  const filtro = { eliminado: false };

  if (soloActivos === 'true' || soloActivos === '1') filtro.activo = true;

  if (q) {
    const regex = new RegExp(escapar(q), 'i');
    filtro.$or = [{ nombre: regex }, { descripcion: regex }];
  }

  return ParametroAnalisis.find(filtro).sort({ nombre: 1 });
}

async function crear(data) {
  const nombre = String(data.nombre).trim();
  const existe = await ParametroAnalisis.findOne({ nombre, eliminado: false });
  if (existe) throw httpError(409, 'Ya existe un parametro con ese nombre');

  return ParametroAnalisis.create({
    nombre,
    descripcion: data.descripcion || '',
    precio: Number(data.precio),
    unidad: data.unidad || ''
  });
}

async function editar(id, data) {
  validarId(id);

  const parametro = await ParametroAnalisis.findOne({ _id: id, eliminado: false });
  if (!parametro) throw httpError(404, 'Parametro no encontrado');

  const nombre = String(data.nombre).trim();
  const otro = await ParametroAnalisis.findOne({ nombre, eliminado: false, _id: { $ne: id } });
  if (otro) throw httpError(409, 'Ya existe un parametro con ese nombre');

  parametro.nombre = nombre;
  parametro.descripcion = data.descripcion || '';
  parametro.precio = Number(data.precio);
  parametro.unidad = data.unidad || '';

  await parametro.save();
  return parametro;
}

async function cambiarActivo(id, activo) {
  validarId(id);

  const parametro = await ParametroAnalisis.findOne({ _id: id, eliminado: false });
  if (!parametro) throw httpError(404, 'Parametro no encontrado');

  parametro.activo = activo;
  await parametro.save();
  return parametro;
}

export { listar, crear, editar, cambiarActivo };
