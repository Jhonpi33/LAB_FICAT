import * as service from '../services/disposiciones.service.js';
import { ok } from '../utils/responses.js';

async function listar(req, res, next) {
  try {
    const datos = await service.listar(req.query);
    return ok(res, datos, 'Disposiciones obtenidas correctamente');
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const datos = await service.crear(req.body, req.usuario);
    return ok(res, datos, 'Disposición registrada correctamente');
  } catch (err) {
    next(err);
  }
}

export { listar, crear };
