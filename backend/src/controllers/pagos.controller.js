import * as service from '../services/pagos.service.js';
import { ok } from '../utils/responses.js';

async function listar(req, res, next) {
  try {
    const datos = await service.listar(req.query);
    return ok(res, datos, 'Pagos obtenidos correctamente');
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const datos = await service.crear(req.body);
    return ok(res, datos, 'Pago registrado correctamente');
  } catch (err) {
    next(err);
  }
}

async function cambiarEstado(req, res, next) {
  try {
    const datos = await service.cambiarEstado(req.params.id, req.body.estado);
    return ok(res, datos, 'Estado actualizado correctamente');
  } catch (err) {
    next(err);
  }
}

export { listar, crear, cambiarEstado };
