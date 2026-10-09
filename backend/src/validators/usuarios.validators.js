const { body } = require('express-validator');

const nombreRule = body('nombre')
  .trim()
  .isLength({ min: 3, max: 120 })
  .withMessage('El nombre debe tener entre 3 y 120 caracteres');

const emailRule = body('email')
  .trim()
  .isEmail()
  .withMessage('El email no es valido')
  .normalizeEmail();

const passwordRule = body('password')
  .isLength({ min: 8 })
  .withMessage('La contrasena debe tener minimo 8 caracteres')
  .matches(/\d/)
  .withMessage('La contrasena debe incluir al menos un numero');

const passwordOpcionalRule = body('password')
  .optional({ nullable: true })
  .custom((valor) => {
    if (valor === undefined || valor === null || valor === '') return true;
    if (String(valor).length < 8 || !/\d/.test(String(valor))) {
      throw new Error('La contrasena debe tener minimo 8 caracteres y al menos un numero');
    }
    return true;
  });

const crearRules = [
  nombreRule,
  emailRule,
  passwordRule,
  body('rol')
    .optional()
    .custom((valor) => {
      if (valor !== 'encargado') {
        throw new Error('Solo se pueden crear encargados');
      }
      return true;
    })
];

const editarRules = [
  nombreRule,
  emailRule,
  passwordOpcionalRule,
  body('rol')
    .optional()
    .isIn(['encargado', 'usuario'])
    .withMessage('El rol solo puede ser encargado o usuario')
];

const estadoRules = [
  body('activo')
    .isBoolean()
    .withMessage('El campo activo debe ser booleano')
];

module.exports = { crearRules, editarRules, estadoRules };
