import mongoose from 'mongoose';
import Muestra from '../models/Muestra.js';
import Solicitud from '../models/Solicitud.js';
import AnalisisMuestra from '../models/AnalisisMuestra.js';
import { generarCodigoMuestra, generarCodigoSeguimiento } from './secuencias.service.js';
import { registrarEvento } from './eventos.service.js';
import { crearIniciales } from './analisis.service.js';
import { notificarAutomatica } from './notificaciones.service.js';
import { httpError } from '../utils/responses.js';

const ETAPAS = ['ingresada', 'en_proceso', 'en_analisis', 'resultados_validados'];

function escapar(texto) {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Muestra no encontrada');
}

function conRelaciones(muestra) {
  return Muestra.populate(muestra, [
    { path: 'cliente_id', select: 'nombre numero_documento' },
    { path: 'solicitud_id', select: 'descripcion estado requiere_pago' },
    { path: 'parametros_ids', select: 'nombre' }
  ]);
}

async function listar({ q, estado }) {
  const filtro = { eliminado: false };

  if (estado) filtro.estado = estado;

  if (q) {
    const regex = new RegExp(escapar(q), 'i');
    filtro.$or = [{ nombre_muestra: regex }, { codigo: regex }];
  }

  return Muestra.find(filtro).sort({ fecha_recepcion: -1 }).populate('cliente_id', 'nombre').populate('solicitud_id', 'descripcion').populate('parametros_ids', 'nombre');
}

async function crear(data, usuario) {
  validarId(data.solicitud_id);

  const solicitud = await Solicitud.findOne({ _id: data.solicitud_id, eliminado: false });
  if (!solicitud) throw httpError(404, 'Solicitud no encontrada');

  // Código interno automático (RF-026/027) y código público impredecible (RF-075).
  const codigo = await generarCodigoMuestra();

  const muestra = await Muestra.create({
    solicitud_id: solicitud._id,
    cliente_id: solicitud.cliente_id,
    nombre_muestra: data.nombre_muestra,
    descripcion: data.descripcion,
    tipo_fisico: data.tipo_fisico,
    cantidad: Number(data.cantidad),
    unidad: data.unidad,
    parametros_ids: data.parametros_ids || [],
    verificacion_fisica: Boolean(data.verificacion_fisica),
    estado_recepcion: 'pendiente',
    codigo,
    codigo_seguimiento: generarCodigoSeguimiento(),
    fecha_recepcion: new Date(),
    // RF-092: conservación mínima de 7 días (aquí días calendario).
    fecha_limite_conservacion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  await registrarEvento({
    muestra_id: muestra._id,
    tipo_evento: 'ingreso',
    descripcion: `Muestra ${codigo} registrada en recepción`,
    visible_cliente: true,
    usuario_id: usuario?.id || null
  });

  return conRelaciones(muestra);
}

/**
 * Acepta o rechaza la muestra en la recepción (RF-022/023/024).
 * El rechazo exige motivo (RF-023), validado en el validador.
 */
async function recepcion(id, { aceptar, motivo_rechazo }, usuario) {
  validarId(id);

  const muestra = await Muestra.findOne({ _id: id, eliminado: false });
  if (!muestra) throw httpError(404, 'Muestra no encontrada');

  if (aceptar) {
    muestra.estado_recepcion = 'aceptada';
    if (muestra.estado === 'rechazada') muestra.estado = 'ingresada';
    muestra.motivo_rechazo = '';

    await registrarEvento({
      muestra_id: muestra._id,
      tipo_evento: 'recepcion',
      descripcion: 'Muestra aceptada para su análisis',
      visible_cliente: true,
      usuario_id: usuario?.id || null
    });
  } else {
    muestra.estado_recepcion = 'rechazada';
    muestra.estado = 'rechazada';
    muestra.motivo_rechazo = motivo_rechazo || '';

    await registrarEvento({
      muestra_id: muestra._id,
      tipo_evento: 'rechazo',
      descripcion: `Muestra rechazada: ${motivo_rechazo || 'sin motivo registrado'}`,
      visible_cliente: true,
      usuario_id: usuario?.id || null
    });
  }

  await muestra.save();
  return conRelaciones(muestra);
}

/**
 * Avanza la etapa de la muestra de una en una:
 * ingresada -> en_proceso -> en_analisis -> resultados_validados.
 *
 * Reglas:
 *  - RF-058: muestra externa con pago pendiente no puede iniciar proceso.
 *  - Al pasar a "en_analisis" se crean los análisis iniciales por parámetro.
 *  - RF-056: "resultados_validados" solo si TODOS los análisis están validados.
 */
async function avanzarEtapa(id, { etapa }, usuario) {
  validarId(id);

  if (!ETAPAS.includes(etapa)) throw httpError(400, 'Etapa no válida');

  const muestra = await Muestra.findOne({ _id: id, eliminado: false });
  if (!muestra) throw httpError(404, 'Muestra no encontrada');

  const idxActual = ETAPAS.indexOf(muestra.estado);
  const idxNueva = ETAPAS.indexOf(etapa);

  if (idxActual < 0) throw httpError(400, 'La muestra no está en una etapa activa');
  if (idxNueva !== idxActual + 1) throw httpError(400, 'La etapa debe avanzar de una en una');

  if (etapa === 'en_proceso') {
    const solicitud = await Solicitud.findOne({ _id: muestra.solicitud_id, eliminado: false });
    if (solicitud && solicitud.requiere_pago && solicitud.estado !== 'pagada') {
      throw httpError(400, 'No se puede iniciar el proceso: la solicitud externa aún no tiene el pago confirmado');
    }
  }

  if (etapa === 'en_analisis') {
    await crearIniciales(muestra._id);
  }

  if (etapa === 'resultados_validados') {
    const pendientes = await AnalisisMuestra.countDocuments({ muestra_id: muestra._id, estado: { $ne: 'validado' } });
    if (pendientes > 0) throw httpError(400, 'Hay análisis sin validar: primero valida todos los resultados');
  }

  const estadoAnterior = muestra.estado;
  muestra.estado = etapa;
  if (etapa === 'en_proceso' && !muestra.fecha_inicio) muestra.fecha_inicio = new Date();
  if (etapa === 'resultados_validados') muestra.fecha_cierre = new Date();
  muestra.ultimo_evento_tipo = 'cambio_estado';
  muestra.ultimo_evento_fecha = new Date();
  await muestra.save();

  await registrarEvento({
    muestra_id: muestra._id,
    tipo_evento: 'cambio_estado',
    descripcion: `La muestra pasó de ${estadoAnterior} a ${etapa}`,
    visible_cliente: true,
    estado_anterior: estadoAnterior,
    estado_nuevo: etapa,
    usuario_id: usuario?.id || null
  });

  // RF-107/109: notificación automática por cambio de etapa o resultados listos.
  await notificarAutomatica({
    muestra_id: muestra._id,
    cliente_id: muestra.cliente_id,
    tipo: etapa === 'resultados_validados' ? 'resultados_disponibles' : 'cambio_etapa',
    asunto:
      etapa === 'resultados_validados'
        ? `Resultados listos para tu muestra ${muestra.codigo}`
        : `Tu muestra ${muestra.codigo} cambió de etapa`,
    mensaje:
      etapa === 'resultados_validados'
        ? 'Los resultados de tu muestra ya fueron validados por el laboratorio.'
        : `La muestra pasó de ${estadoAnterior} a ${etapa}.`
  });

  return conRelaciones(muestra);
}

export { listar, crear, recepcion, avanzarEtapa };
