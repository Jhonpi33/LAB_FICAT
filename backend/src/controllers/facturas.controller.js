import * as service from '../services/facturas.service.js';
import { ok } from '../utils/responses.js';

async function listar(req, res, next) {
  try {
    const datos = await service.listar(req.query);
    return ok(res, datos, 'Facturas obtenidas correctamente');
  } catch (err) {
    next(err);
  }
}

async function generar(req, res, next) {
  try {
    const datos = await service.generar(req.body.pago_id, req.usuario);
    return ok(res, datos, 'Factura generada correctamente');
  } catch (err) {
    next(err);
  }
}

async function cambiarEstado(req, res, next) {
  try {
    const datos = await service.cambiarEstado(req.params.id, req.body, req.usuario);
    return ok(res, datos, 'Estado actualizado correctamente');
  } catch (err) {
    next(err);
  }
}

export { listar, generar, cambiarEstado };
