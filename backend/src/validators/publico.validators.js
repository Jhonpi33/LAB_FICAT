import { body, param } from 'express-validator';

const codigoRule = param('codigo')
  .trim()
  .notEmpty()
  .withMessage('El código es obligatorio');

const respuestaRules = [
  body('mensaje')
    .trim()
    .notEmpty()
    .withMessage('La respuesta es obligatoria')
    .isLength({ max: 1000 })
    .withMessage('La respuesta es demasiado larga')
];

const encuestaRules = [
  body('codigo')
    .trim()
    .notEmpty()
    .withMessage('El código es obligatorio'),
  body('calificacion')
    .isInt({ min: 1, max: 5 })
    .withMessage('La calificación debe estar entre 1 y 5'),
  body('comentario')
    .optional({ values: 'falsy' })
    .isLength({ max: 1000 })
    .withMessage('El comentario es demasiado largo')
];

export { codigoRule, respuestaRules, encuestaRules };
