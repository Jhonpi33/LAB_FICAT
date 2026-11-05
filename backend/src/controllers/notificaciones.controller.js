import * as service from '../services/notificaciones.service.js';
import { ok } from '../utils/responses.js';

async function listar(req, res, next) {
  try {
    const datos = await service.listar(req.query);
    return ok(res, datos, 'Notificaciones obtenidas correctamente');
  } catch (err) {
    next(err);
  }
}

async function crearManual(req, res, next) {
  try {
    const datos = await service.crearManual(req.body, req.usuario);
    return ok(res, datos, 'Notificación encolada correctamente');
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

async function reenviar(req, res, next) {
  try {
    const datos = await service.reenviar(req.params.id);
    return ok(res, datos, 'Notificación reencolada para reenvío');
  } catch (err) {
    next(err);
  }
}

export { listar, crearManual, cambiarEstado, reenviar };
