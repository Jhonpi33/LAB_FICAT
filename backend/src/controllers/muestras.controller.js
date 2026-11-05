import * as service from '../services/muestras.service.js';
import { ok } from '../utils/responses.js';

async function listar(req, res, next) {
  try {
    const datos = await service.listar(req.query);
    return ok(res, datos, 'Muestras obtenidas correctamente');
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const datos = await service.crear(req.body, req.usuario);
    return ok(res, datos, 'Muestra registrada correctamente');
  } catch (err) {
    next(err);
  }
}

async function recepcion(req, res, next) {
  try {
    const datos = await service.recepcion(req.params.id, req.body, req.usuario);
    return ok(res, datos, 'Recepción actualizada correctamente');
  } catch (err) {
    next(err);
  }
}

async function avanzarEtapa(req, res, next) {
  try {
    const datos = await service.avanzarEtapa(req.params.id, req.body, req.usuario);
    return ok(res, datos, 'Etapa actualizada correctamente');
  } catch (err) {
    next(err);
  }
}

export { listar, crear, recepcion, avanzarEtapa };
