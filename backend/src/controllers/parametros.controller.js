import * as service from '../services/parametros.service.js';
import { ok } from '../utils/responses.js';

async function listar(req, res, next) {
  try {
    const datos = await service.listar(req.query);
    return ok(res, datos, 'Parámetros obtenidos correctamente');
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const datos = await service.crear(req.body);
    return ok(res, datos, 'Parámetro registrado correctamente');
  } catch (err) {
    next(err);
  }
}

async function editar(req, res, next) {
  try {
    const datos = await service.editar(req.params.id, req.body);
    return ok(res, datos, 'Parámetro actualizado correctamente');
  } catch (err) {
    next(err);
  }
}

async function cambiarActivo(req, res, next) {
  try {
    const datos = await service.cambiarActivo(req.params.id, req.body.activo);
    return ok(res, datos, 'Estado actualizado correctamente');
  } catch (err) {
    next(err);
  }
}

export { listar, crear, editar, cambiarActivo };
