import express from 'express';
import * as controller from '../controllers/disposiciones.controller.js';
import { crearRules } from '../validators/disposiciones.validators.js';
import validar from '../middlewares/validar.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roles.js';

const router = express.Router();

router.use(requireAuth, requireRole('admin', 'encargado'));

router.get('/', controller.listar);
router.post('/', crearRules, validar, controller.crear);

export default router;
