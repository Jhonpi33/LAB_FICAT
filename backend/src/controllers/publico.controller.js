import * as service from '../services/publico.service.js';
import { ok } from '../utils/responses.js';

async function consultarMuestra(req, res, next) {
  try {
    const datos = await service.consultarMuestra(req.params.codigo);
    return ok(res, datos, 'Muestra encontrada');
  } catch (err) {
    next(err);
  }
}

async function responderIncidencia(req, res, next) {
  try {
    const datos = await service.responderIncidencia(req.params.id, req.body.mensaje);
    return ok(res, datos, 'Respuesta registrada correctamente');
  } catch (err) {
    next(err);
  }
}

async function registrarEncuesta(req, res, next) {
  try {
    const datos = await service.registrarEncuesta(req.body);
    return ok(res, datos, 'Encuesta registrada correctamente');
  } catch (err) {
    next(err);
  }
}

export { consultarMuestra, responderIncidencia, registrarEncuesta };
