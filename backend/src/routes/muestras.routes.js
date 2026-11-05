import express from 'express';
import * as controller from '../controllers/muestras.controller.js';
import { crearRules, recepcionRules, etapaRules } from '../validators/muestras.validators.js';
import validar from '../middlewares/validar.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roles.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin', 'encargado'));

router.get('/', controller.listar);
router.post('/', crearRules, validar, controller.crear);
router.patch('/:id/recepcion', recepcionRules, validar, controller.recepcion);
router.patch('/:id/etapa', etapaRules, validar, controller.avanzarEtapa);

export default router;
