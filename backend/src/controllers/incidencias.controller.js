import * as service from '../services/incidencias.service.js';
import { ok } from '../utils/responses.js';

async function listar(req, res, next) {
  try {
    const datos = await service.listar(req.query);
    return ok(res, datos, 'Incidencias obtenidas correctamente');
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const datos = await service.crear(req.body, req.usuario);
    return ok(res, datos, 'Incidencia registrada correctamente');
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

async function responderCliente(req, res, next) {
  try {
    const datos = await service.responderCliente(req.params.id, req.body.mensaje);
    return ok(res, datos, 'Respuesta registrada correctamente');
  } catch (err) {
    next(err);
  }
}

export { listar, crear, cambiarEstado, responderCliente };
