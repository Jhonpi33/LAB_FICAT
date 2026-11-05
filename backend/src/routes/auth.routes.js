import express from 'express';
import * as controller from '../controllers/auth.controller.js';
import { regRules, loginRules, perfilRules } from '../validators/auth.validators.js';
import validar from '../middlewares/validar.js';
import { requireAuth } from '../middlewares/auth.js';

const router = express.Router();

router.post('/registro', regRules, validar, controller.registro);
router.post('/login', loginRules, validar, controller.login);
router.get('/me', requireAuth, controller.me);
router.put('/perfil', requireAuth, perfilRules, validar, controller.actualizarPerfil);

export default router;
