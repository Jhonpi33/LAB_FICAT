const service = require('../services/solicitudes.service');
const { ok } = require('../utils/responses');

async function listar(req, res, next) {
  try {
    const datos = await service.listar(req.query);
    return ok(res, datos, 'Solicitudes obtenidas correctamente');
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const datos = await service.obtener(req.params.id);
    return ok(res, datos, 'Solicitud obtenida correctamente');
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const datos = await service.crear(req.body);
    return ok(res, datos, 'Solicitud creada correctamente');
  } catch (err) {
    next(err);
  }
}

async function editar(req, res, next) {
  try {
    const datos = await service.editar(req.params.id, req.body);
    return ok(res, datos, 'Solicitud actualizada correctamente');
  } catch (err) {
    next(err);
  }
}

async function cambiarEstado(req, res, next) {
  try {
    const datos = await service.cambiarEstado(req.params.id, req.body.estado);
    return ok(res, datos, 'Estado de la solicitud actualizado correctamente');
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const datos = await service.eliminar(req.params.id, req.usuario.email);
    return ok(res, datos, 'Solicitud eliminada correctamente');
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, editar, cambiarEstado, eliminar };
