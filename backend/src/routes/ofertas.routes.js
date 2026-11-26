import express from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roles.js';
import { ok } from '../utils/responses.js';
import * as service from '../services/ofertas.service.js';

const router = express.Router();
const manejar = fn => (req,res,next) => fn(req,res).catch(next);
router.use((req,res,next) => { res.set('Cache-Control','no-store'); next(); });
router.get('/firma/:token/pdf', manejar(async (req,res) => res.type('pdf').send((await service.consultarFirma(req.params.token)).borrador)));
router.get('/firma/:token', manejar(async (req,res) => {
  const oferta = await service.consultarFirma(req.params.token);
  ok(res, { cliente: oferta.cliente, numero: oferta.numero });
}));
router.post('/firma/:token', manejar(async (req,res) => ok(res,null,await service.firmar(req.params.token, req.body))));
router.use(requireAuth, requireRole('admin','encargado'));
router.get('/clientes', manejar(async (req,res) => ok(res,await service.buscarCliente(req.query.q))));
router.post('/', manejar(async (req,res) => ok(res,await service.crear(req.body),'Solicitud y cotización guardadas.')));
router.get('/:id', manejar(async (req,res) => {
  const oferta = await service.obtener(req.params.id);
  ok(res, { numero: oferta.numero, cliente: oferta.cliente, correo: oferta.correo,
    firmada: oferta.firmada, enviada: oferta.enviada, produccionEnviada: oferta.produccionEnviada,
    reciboEnviado: oferta.reciboEnviado, cotizacion: oferta.cotizacion });
}));
router.get('/:id/pdf', manejar(async (req,res) => {
  const oferta = await service.obtener(req.params.id);
  res.type('pdf').send(oferta.pdf || oferta.borrador);
}));
router.post('/:id/enviar', manejar(async (req,res) => ok(res,null,await service.enviar(req.params.id,req.body.destino))));
export default router;
