import mongoose from 'mongoose';
import Informe from '../models/Informe.js';
import Muestra from '../models/Muestra.js';
import { generarNumeroInforme } from './secuencias.service.js';
import { registrarEvento } from './eventos.service.js';
import { httpError } from '../utils/responses.js';

function validarId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(404, 'Informe no encontrado');
}

function conRelaciones(informe) {
  return Informe.populate(informe, [
    { path: 'muestra_id', select: 'codigo nombre_muestra cliente_id', populate: { path: 'cliente_id', select: 'nombre' } }
  ]);
}

async function listar({ q, estado }) {
  const filtro = { eliminado: false };

  if (estado) filtro.estado = estado;

  if (q) {
    const regex = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filtro.$or = [{ numero_informe: regex }];
  }

  return Informe.find(filtro)
    .populate({ path: 'muestra_id', select: 'codigo nombre_muestra cliente_id', populate: { path: 'cliente_id', select: 'nombre' } })
    .sort({ fecha_creacion: -1 });
}

/**
 * Genera el informe de una muestra (RF-094): solo para muestras con resultados
 * validados (RF-096). Si ya existe un informe vigente, se versiona.
 */
async function generar(muestraId, usuario) {
  validarId(muestraId);

  const muestra = await Muestra.findOne({ _id: muestraId, eliminado: false });
  if (!muestra) throw httpError(404, 'Muestra no encontrada');

  if (muestra.estado !== 'resultados_validados') {
    throw httpError(400, 'La muestra debe tener los resultados validados para generar el informe');
  }

  const anterior = await Informe.findOne({ muestra_id: muestra._id, eliminado: false }).sort({ version: -1 });

  const informe = await Informe.create({
    muestra_id: muestra._id,
    numero_informe: await generarNumeroInforme(),
    estado: 'generado',
    version: anterior ? anterior.version + 1 : 1,
    regenerado_de: anterior?._id || null,
    generado_por: usuario?.nombre || null,
    fecha_generacion: new Date()
  });

  return conRelaciones(informe);
}

/**
 * Cambia el estado: generado -> disponible -> enviado (envío simulado, RNF-019).
 * Al pasar a "disponible" se registra un evento público de cierre (RF-081).
 */
async function cambiarEstado(id, { estado }, usuario) {
  validarId(id);

  const informe = await Informe.findOne({ _id: id, eliminado: false });
  if (!informe) throw httpError(404, 'Informe no encontrado');

  const orden = ['borrador', 'generado', 'disponible', 'enviado'];
  if (!orden.includes(estado)) throw httpError(400, 'Estado no válido');

  informe.estado = estado;
  if (estado === 'disponible') {
    informe.fecha_disponibilidad = new Date();
    await registrarEvento({
      muestra_id: informe.muestra_id,
      tipo_evento: 'cierre',
      descripcion: `Informe ${informe.numero_informe} disponible para el cliente`,
      visible_cliente: true,
      usuario_id: usuario?.id || null
    });
  }

  await informe.save();
  return conRelaciones(informe);
}

export { listar, generar, cambiarEstado };
