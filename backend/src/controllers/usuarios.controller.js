const service = require('../services/usuarios.service');
const { ok } = require('../utils/responses');

async function listar(req, res, next) {
  try {
    const datos = await service.listar(req.query);
    return ok(res, datos, 'Usuarios obtenidos correctamente');
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const datos = await service.crear(req.body);
    return ok(res, datos, 'Encargado creado correctamente');
  } catch (err) {
    next(err);
  }
}

async function editar(req, res, next) {
  try {
    const datos = await service.editar(req.params.id, req.body);
    return ok(res, datos, 'Usuario actualizado correctamente');
  } catch (err) {
    next(err);
  }
}

async function cambiarEstado(req, res, next) {
  try {
    const datos = await service.cambiarEstado(req.params.id, req.body.activo, req.usuario.id);
    return ok(res, datos, 'Estado actualizado correctamente');
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, crear, editar, cambiarEstado };
