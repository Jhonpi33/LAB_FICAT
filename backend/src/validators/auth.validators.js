const { body } = require('express-validator');

const regRules = [
  body('nombre')
    .trim()
    .isLength({ min: 3, max: 120 })
    .withMessage('El nombre debe tener entre 3 y 120 caracteres'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('El email no es valido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contrasena debe tener minimo 8 caracteres')
    .matches(/\d/)
    .withMessage('La contrasena debe incluir al menos un numero')
];

const loginRules = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('El email no es valido')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('La contrasena es obligatoria')
];

const perfilRules = [
  body('nombre')
    .trim()
    .isLength({ min: 3, max: 120 })
    .withMessage('El nombre debe tener entre 3 y 120 caracteres'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('El email no es valido')
    .normalizeEmail(),
  body('password')
    .optional({ nullable: true })
    .custom((valor) => {
      if (valor === undefined || valor === null || valor === '') return true;
      if (String(valor).length < 8 || !/\d/.test(String(valor))) {
        throw new Error('La contrasena debe tener minimo 8 caracteres y al menos un numero');
      }
      return true;
    })
];

module.exports = { regRules, loginRules, perfilRules };
