import EventoTrazabilidad from '../models/EventoTrazabilidad.js';

/**
 * Registra un evento de trazabilidad (append-only, RNF-005).
 * @param {Object} evento
 * @param {ObjectId} evento.muestra_id
 * @param {string} evento.tipo_evento
 * @param {string} evento.descripcion
 * @param {boolean} [evento.visible_cliente=false] - ¿se proyecta al seguimiento público?
 */
export async function registrarEvento({
  muestra_id,
  tipo_evento,
  descripcion,
  visible_cliente = false,
  estado_anterior = null,
  estado_nuevo = null,
  usuario_id = null,
  ubicacion = ''
}) {
  return EventoTrazabilidad.create({
    muestra_id,
    tipo_evento,
    descripcion,
    visible_cliente,
    estado_anterior,
    estado_nuevo,
    usuario_id,
    ubicacion,
    fecha: new Date()
  });
}
