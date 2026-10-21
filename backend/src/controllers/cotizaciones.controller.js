const service = require('../services/cotizaciones.service');
const { ok } = require('../utils/responses');

async function listar(req, res, next) {
  try {
    const datos = await service.listar(req.query);
    return ok(res, datos, 'Cotizaciones obtenidas correctamente');
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const datos = await service.obtener(req.params.id);
    return ok(res, datos, 'Cotizacion obtenida correctamente');
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const datos = await service.crear(req.body);
    return ok(res, datos, 'Cotizacion creada correctamente');
  } catch (err) {
    next(err);
  }
}

async function editar(req, res, next) {
  try {
    const datos = await service.editar(req.params.id, req.body);
    return ok(res, datos, 'Cotizacion actualizada correctamente');
  } catch (err) {
    next(err);
  }
}

async function cambiarEstado(req, res, next) {
  try {
    const datos = await service.cambiarEstado(req.params.id, req.body.estado);
    return ok(res, datos, 'Estado de la cotizacion actualizado correctamente');
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const datos = await service.eliminar(req.params.id, req.usuario.email);
    return ok(res, datos, 'Cotizacion eliminada correctamente');
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, editar, cambiarEstado, eliminar };
