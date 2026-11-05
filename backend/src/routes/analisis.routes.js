import express from 'express';
import * as controller from '../controllers/analisis.controller.js';
import { muestraIdRule, resultadoRules, estadoRules } from '../validators/analisis.validators.js';
import validar from '../middlewares/validar.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roles.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin', 'encargado'));

router.get('/muestra/:muestraId', muestraIdRule, validar, controller.listarPorMuestra);
router.put('/:id/resultado', resultadoRules, validar, controller.registrarResultado);
router.patch('/:id/estado', estadoRules, validar, controller.cambiarEstado);

export default router;
