import crypto from 'crypto';
import mongoose from 'mongoose';
import Muestra from '../models/Muestra.js';
import EventoTrazabilidad from '../models/EventoTrazabilidad.js';
import Incidencia from '../models/Incidencia.js';
import Encuesta from '../models/Encuesta.js';
import Informe from '../models/Informe.js';
import Factura from '../models/Factura.js';
import { httpError } from '../utils/responses.js';

const ETIQUETA_ESTADO = {
  ingresada: 'Ingresada',
  en_proceso: 'En proceso',
  en_analisis: 'En análisis',
  resultados_validados: 'Resultados validados',
  cerrada: 'Cerrada',
  rechazada: 'Rechazada',
  en_almacen: 'En almacén',
  devuelta: 'Devuelta',
  desechada: 'Desechada'
};

const TITULO_EVENTO = {
  ingreso: 'Muestra recibida',
  recepcion: 'Verificación completada',
  cambio_estado: 'Actualización de etapa',
  cambio_fecha: 'Fecha estimada actualizada',
  resultado: 'Resultado registrado',
  validacion: 'Resultados validados',
  observacion: 'Novedad del proceso',
  rechazo: 'Muestra rechazada',
  cierre: 'Proceso cerrado'
};

const TIPO_INCIDENCIA = {
  informativa: 'Informativa',
  demora: 'Demora',
  requiere_accion_cliente: 'Requiere acción del cliente'
};

async function buscarMuestra(codigo) {
  const buscado = String(codigo).trim().toUpperCase();

  let muestra = await Muestra.findOne({ codigo: buscado, eliminado: false });
  if (!muestra) muestra = await Muestra.findOne({ codigo_seguimiento: buscado, eliminado: false });

  if (!muestra) {
    throw httpError(404, 'No encontramos una muestra con ese código. Revisa los datos e inténtalo de nuevo.');
  }
  return muestra;
}

/**
 * Consulta PÚBLICA de una muestra (RF-075 a RF-084, RNF-004/005):
 * proyección sin datos internos, solo lo autorizado para compartir.
 */
async function consultarMuestra(codigo) {
  const muestra = await buscarMuestra(codigo);

  const [eventos, incidencias, demora, informe, factura] = await Promise.all([
    EventoTrazabilidad.find({ muestra_id: muestra._id, visible_cliente: true }).sort({ fecha: -1 }),
    Incidencia.find({
      muestra_id: muestra._id,
      eliminado: false,
      visible_cliente: true,
      estado: { $in: ['abierta', 'esperando_cliente'] }
    }).sort({ fecha_creacion: -1 }),
    Incidencia.findOne({ muestra_id: muestra._id, eliminado: false, tipo: 'demora', estado: { $ne: 'cerrada' } }),
    Informe.findOne({ muestra_id: muestra._id, eliminado: false, estado: { $in: ['disponible', 'enviado'] } }),
    Factura.findOne({ solicitud_id: muestra.solicitud_id, eliminado: false, estado: { $in: ['generada', 'enviada'] } })
  ]);

  return {
    code: muestra.codigo,
    food: muestra.nombre_muestra,
    status: ETIQUETA_ESTADO[muestra.estado] || muestra.estado,
    dueDate: demora?.nueva_fecha_estimada || muestra.fecha_estimada_entrega || null,
    isDelayed: Boolean(demora),
    publicEvents: eventos.map((e) => ({
      at: e.fecha,
      title: TITULO_EVENTO[e.tipo_evento] || 'Actualización',
      description: e.descripcion
    })),
    incidentes: incidencias.map((i) => ({
      id: i._id,
      type: TIPO_INCIDENCIA[i.tipo] || i.tipo,
      text: i.descripcion,
      status: 'Abierta'
    })),
    resultStatus: muestra.estado === 'resultados_validados' ? 'Validado' : 'Pendiente',
    informeDisponible: Boolean(informe),
    invoiceStatus: factura ? 'Generada' : 'Pendiente'
  };
}

/** Respuesta del cliente a una incidencia (RF-069/070). */
async function responderIncidencia(id, mensaje) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Incidencia no encontrada');

  const incidencia = await Incidencia.findOne({ _id: id, eliminado: false, visible_cliente: true });
  if (!incidencia) throw httpError(404, 'Incidencia no encontrada');

  if (incidencia.estado !== 'esperando_cliente') {
    throw httpError(400, 'Esta solicitud de información ya fue respondida');
  }

  incidencia.respuestas.push({ tipo_usuario: 'cliente', mensaje: String(mensaje).trim(), fecha: new Date() });
  incidencia.estado = 'en_revision';
  await incidencia.save();

  return { ok: true };
}

/** Registra la encuesta de satisfacción (RF-098). */
async function registrarEncuesta({ codigo, calificacion, comentario }) {
  const muestra = await buscarMuestra(codigo);

  const encuesta = await Encuesta.create({
    muestra_id: muestra._id,
    cliente_id: muestra.cliente_id,
    token: crypto.randomBytes(16).toString('hex'),
    estado: 'respondida',
    fecha_respuesta: new Date(),
    respuestas: [
      {
        pregunta: 'satisfaccion',
        calificacion: Number(calificacion),
        comentario: comentario || ''
      }
    ]
  });

  return { ok: true };
}

export { consultarMuestra, responderIncidencia, registrarEncuesta };
