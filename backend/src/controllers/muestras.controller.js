import * as service from '../services/muestras.service.js';
import { ok } from '../utils/responses.js';

async function listar(req, res, next) {
  try {
    const datos = await service.listar(req.query);
    return ok(res, datos, 'Muestras obtenidas correctamente');
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const datos = await service.crear(req.body, req.usuario);
    let avisoCorreo;
    try {
      datos.confirmacion_enviada = await service.enviarConfirmacion(datos._id);
    } catch (error) {
      avisoCorreo = error.status && error.status < 500 ? error.message
        : 'La muestra quedó guardada. El correo está pendiente. Puedes reintentar desde Muestras.';
    }
    return ok(res, { ...datos.toObject(), avisoCorreo }, 'Muestra registrada correctamente');
  } catch (err) {
    next(err);
  }
}

async function recepcion(req, res, next) {
  try {
    const datos = await service.recepcion(req.params.id, req.body, req.usuario);
    return ok(res, datos, 'Recepción actualizada correctamente');
  } catch (err) {
    next(err);
  }
}

async function avanzarEtapa(req, res, next) {
  try {
    const datos = await service.avanzarEtapa(req.params.id, req.body, req.usuario);
    return ok(res, datos, 'Etapa actualizada correctamente');
  } catch (err) {
    next(err);
  }
}

async function enviarConfirmacion(req, res, next) {
  try {
    const fecha = await service.enviarConfirmacion(req.params.id);
    return ok(res, { fecha }, 'El correo de confirmación figura como enviado.');
  } catch (error) { next(error); }
}

export { listar, crear, recepcion, avanzarEtapa, enviarConfirmacion };
