import { body, param } from 'express-validator';

const muestraIdRule = param('muestraId')
  .isMongoId()
  .withMessage('Muestra no válida');

const resultadoRules = [
  body('resultado')
    .trim()
    .notEmpty()
    .withMessage('El resultado es obligatorio')
    .isLength({ max: 300 })
    .withMessage('El resultado es demasiado largo'),
  body('valor')
    .optional({ values: 'falsy' })
    .isNumeric()
    .withMessage('El valor debe ser numérico')
];

const estadoRules = [
  body('estado')
    .isIn(['validado', 'en_curso'])
    .withMessage('El estado solo puede ser validado o en_curso'),
  body('motivo')
    .if((value, { req }) => req.body.estado === 'en_curso')
    .trim()
    .notEmpty()
    .withMessage('El motivo de la devolución es obligatorio')
];

export { muestraIdRule, resultadoRules, estadoRules };
