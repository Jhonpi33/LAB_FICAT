const service = require('../services/clientes.service');
const { ok } = require('../utils/responses');

async function listar(req, res, next) {
  try {
    const datos = await service.listar(req.query);
    return ok(res, datos, 'Clientes obtenidos correctamente');
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const datos = await service.obtener(req.params.id);
    return ok(res, datos, 'Cliente obtenido correctamente');
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const datos = await service.crear(req.body);
    return ok(res, datos, 'Cliente creado correctamente');
  } catch (err) {
    next(err);
  }
}

async function editar(req, res, next) {
  try {
    const datos = await service.editar(req.params.id, req.body);
    return ok(res, datos, 'Cliente actualizado correctamente');
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const datos = await service.eliminar(req.params.id, req.usuario.email);
    return ok(res, datos, 'Cliente eliminado correctamente');
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, editar, eliminar };
