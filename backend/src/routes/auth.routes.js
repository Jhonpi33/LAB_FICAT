import { body } from 'express-validator';
import { iniciarRegistro, completarRegistro } from '../services/registro.service.js';
import express from 'express';
import * as controller from '../controllers/auth.controller.js';
import { regRules, loginRules, perfilRules } from '../validators/auth.validators.js';
import validar from '../middlewares/validar.js';
import { requireAuth } from '../middlewares/auth.js';

const router = express.Router();

router.post('/registro', body('email').trim().isEmail().withMessage('El correo no es válido').customSanitizer(email => String(email).toLowerCase()), validar, async (req, res, next) => {
  try {
    await iniciarRegistro(req.body.email);
    res.json({ ok: true, mensaje: 'Si puedes registrar este correo, recibirás un enlace. Puedes solicitar otro en un minuto.' });
  } catch (error) { next(error); }
});
router.post('/confirmar', regRules, body('token').isHexadecimal().isLength({ min: 64, max: 64 }),
  body('ficha').optional().isString().matches(/^\d{3,15}$/).withMessage('El número de ficha no es válido'), validar, async (req, res, next) => {
    try { res.json({ ok: true, mensaje: await completarRegistro(req.body) }); } catch (error) { next(error); }
  });
router.post('/login', loginRules, validar, controller.login);
router.get('/me', requireAuth, controller.me);
router.put('/perfil', requireAuth, perfilRules, validar, controller.actualizarPerfil);

export default router;
