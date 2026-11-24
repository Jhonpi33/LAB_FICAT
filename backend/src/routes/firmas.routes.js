import express from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roles.js';
import { ok } from '../utils/responses.js';
import { camposRecepcion, camposMuestra } from '../services/recepcion-pdf.js';
import * as service from '../services/firmas.service.js';

const router = express.Router();
const personal = [requireAuth, requireRole('admin', 'encargado')];
const manejar = fn => (req, res, next) => fn(req, res).catch(next);
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
const enviarPdf = (res, pdf) => res.type('application/pdf').send(pdf);

router.get('/:tipo(solicitud|muestra)/:id', ...personal, manejar(async (req, res) => {
  ok(res, { ...await service.preparar(req.params.id, req.usuario.nombre, req.params.tipo), camposRecepcion, camposMuestra });
}));
router.put('/:tipo(solicitud|muestra)/:id', ...personal, manejar(async (req, res) => {
  await service.guardar(req.params.id, req.body, req.params.tipo);
  ok(res, null, 'Formulario guardado. El PDF está listo para descargar.');
}));
router.get('/:tipo(solicitud|muestra)/:id/pdf', ...personal, manejar(async (req, res) => {
  enviarPdf(res, await service.descargarInterno(req.params.id, req.params.tipo));
}));
router.post('/:tipo(solicitud|muestra)/:id', ...personal, manejar(async (req, res) => {
  ok(res, null, await service.solicitarFirma(req.params.id, req.params.tipo));
}));
router.get('/:token/pdf', manejar(async (req, res) => {
  enviarPdf(res, (await service.consultarFirma(req.params.token)).borrador);
}));
router.get('/:token', manejar(async (req, res) => {
  const { cliente, solicitud } = await service.consultarFirma(req.params.token);
  ok(res, { cliente, solicitud });
}));
router.post('/:token', manejar(async (req, res) => {
  ok(res, null, await service.firmar(req.params.token, req.body));
}));

export default router;
