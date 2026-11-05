import mongoose from 'mongoose';
import AnalisisMuestra from '../models/AnalisisMuestra.js';
import Muestra from '../models/Muestra.js';
import ParametroAnalisis from '../models/ParametroAnalisis.js';
import { registrarEvento } from './eventos.service.js';
import { httpError } from '../utils/responses.js';

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Análisis no encontrado');
}

async function listarPorMuestra(muestraId) {
  if (!mongoose.Types.ObjectId.isValid(muestraId)) throw httpError(404, 'Muestra no encontrada');
  return AnalisisMuestra.find({ muestra_id: muestraId })
    .populate('parametro_id', 'nombre unidad')
    .sort({ numero_ejecucion: 1 });
}

/**
 * Crea los análisis iniciales para cada parámetro asignado a la muestra
 * (si no existen). Se llama al pasar la muestra a "en_analisis".
 */
async function crearIniciales(muestraId) {
  const muestra = await Muestra.findOne({ _id: muestraId, eliminado: false });
  if (!muestra) throw httpError(404, 'Muestra no encontrada');

  const creados = [];
  for (const parametroId of muestra.parametros_ids || []) {
    const existe = await AnalisisMuestra.findOne({ muestra_id: muestra._id, parametro_id: parametroId, numero_ejecucion: 1 });
    if (existe) continue;

    const parametro = await ParametroAnalisis.findOne({ _id: parametroId, eliminado: false });
    const analisis = await AnalisisMuestra.create({
      muestra_id: muestra._id,
      parametro_id: parametroId,
      numero_ejecucion: 1,
      tipo: 'inicial',
      estado: 'en_curso',
      unidad: parametro?.unidad || '',
      fecha_inicio: new Date()
    });
    creados.push(analisis);
  }
  return creados;
}

/**
 * Registra el resultado de un análisis (RF-052). Lo deja "completado".
 */
async function registrarResultado(id, { resultado, valor }, usuario) {
  validarId(id);

  const analisis = await AnalisisMuestra.findOne({ _id: id });
  if (!analisis) throw httpError(404, 'Análisis no encontrado');

  analisis.resultado = String(resultado).trim();
  analisis.valor = valor === undefined || valor === null || valor === '' ? null : Number(valor);
  analisis.estado = 'completado';
  analisis.fecha_finalizacion = new Date();
  analisis.realizado_por = usuario?.nombre || null;

  await analisis.save();

  await registrarEvento({
    muestra_id: analisis.muestra_id,
    tipo_evento: 'resultado',
    descripcion: `Resultado registrado para el parámetro #${analisis.parametro_id}`,
    visible_cliente: false,
    usuario_id: usuario?.id || null
  });

  return analisis.populate('parametro_id', 'nombre unidad');
}

/**
 * Valida (RF-053) o devuelve (RF-054/055) un análisis.
 */
async function cambiarEstado(id, { estado, motivo }, usuario) {
  validarId(id);

  const analisis = await AnalisisMuestra.findOne({ _id: id });
  if (!analisis) throw httpError(404, 'Análisis no encontrado');

  if (estado === 'validado') {
    if (analisis.estado !== 'completado') throw httpError(400, 'Primero debe registrar el resultado');
    analisis.estado = 'validado';
    analisis.fecha_validacion = new Date();
    analisis.validado_por = usuario?.nombre || null;

    await registrarEvento({
      muestra_id: analisis.muestra_id,
      tipo_evento: 'validacion',
      descripcion: 'Resultado validado',
      visible_cliente: false,
      usuario_id: usuario?.id || null
    });
  } else if (estado === 'en_curso') {
    // Devolución a etapa anterior: exige motivo (RF-055).
    analisis.estado = 'en_curso';
    analisis.motivo_repeticion = motivo || '';
    analisis.resultado = '';
    analisis.valor = null;
    analisis.fecha_finalizacion = null;
    analisis.fecha_validacion = null;

    await registrarEvento({
      muestra_id: analisis.muestra_id,
      tipo_evento: 'repeticion',
      descripcion: motivo || 'Resultado devuelto para repetir',
      visible_cliente: false,
      usuario_id: usuario?.id || null
    });
  } else {
    throw httpError(400, 'Estado no válido');
  }

  await analisis.save();
  return analisis.populate('parametro_id', 'nombre unidad');
}

export { listarPorMuestra, crearIniciales, registrarResultado, cambiarEstado };
