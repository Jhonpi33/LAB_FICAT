const router = require('express').Router();
const controller = require('../controllers/auth.controller');
const { regRules, loginRules, perfilRules } = require('../validators/auth.validators');
const validar = require('../middlewares/validar');
const { requireAuth } = require('../middlewares/auth');

router.post('/registro', regRules, validar, controller.registro);
router.post('/login', loginRules, validar, controller.login);
router.get('/me', requireAuth, controller.me);
router.put('/perfil', requireAuth, perfilRules, validar, controller.actualizarPerfil);

module.exports = router;
