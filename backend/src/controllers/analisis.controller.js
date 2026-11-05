import * as service from '../services/analisis.service.js';
import { ok } from '../utils/responses.js';

async function listarPorMuestra(req, res, next) {
  try {
    const datos = await service.listarPorMuestra(req.params.muestraId);
    return ok(res, datos, 'Análisis obtenidos correctamente');
  } catch (err) {
    next(err);
  }
}

async function registrarResultado(req, res, next) {
  try {
    const datos = await service.registrarResultado(req.params.id, req.body, req.usuario);
    return ok(res, datos, 'Resultado registrado correctamente');
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

export { listarPorMuestra, registrarResultado, cambiarEstado };
