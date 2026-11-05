import express from 'express';
import * as controller from '../controllers/incidencias.controller.js';
import { crearRules, estadoRules, respuestaClienteRules } from '../validators/incidencias.validators.js';
import validar from '../middlewares/validar.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roles.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin', 'encargado'));

router.get('/', controller.listar);
router.post('/', crearRules, validar, controller.crear);
router.patch('/:id/estado', estadoRules, validar, controller.cambiarEstado);
router.post('/:id/respuesta', respuestaClienteRules, validar, controller.responderCliente);

export default router;
