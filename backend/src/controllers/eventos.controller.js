import * as service from '../services/actividad.service.js';
import { ok } from '../utils/responses.js';

/**
 * GET /api/eventos/actividad?dias=371
 * Devuelve la actividad diaria del laboratorio para el heatmap del panel.
 */
async function actividad(req, res, next) {
  try {
    const pedido = Number(req.query.dias) || 371;
    const dias = Math.min(Math.max(pedido, 30), 730);
    const datos = await service.actividadDiaria(dias);
    return ok(res, datos, 'Actividad obtenida correctamente');
  } catch (err) {
    next(err);
  }
}

export { actividad };
