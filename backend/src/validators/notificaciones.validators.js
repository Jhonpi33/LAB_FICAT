import { body } from 'express-validator';

const crearRules = [
  body('muestra_id')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('Muestra no válida'),
  body('cliente_id')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('Cliente no válido'),
  body('asunto')
    .trim()
    .notEmpty()
    .withMessage('El asunto es obligatorio')
    .isLength({ max: 200 })
    .withMessage('El asunto es demasiado largo'),
  body('mensaje')
    .trim()
    .notEmpty()
    .withMessage('El mensaje es obligatorio')
    .isLength({ max: 2000 })
    .withMessage('El mensaje es demasiado largo')
];

const estadoRules = [
  body('estado')
    .isIn(['enviada', 'fallida'])
    .withMessage('El estado solo puede ser enviada o fallida'),
  body('error')
    .optional({ values: 'falsy' })
    .isLength({ max: 300 })
    .withMessage('El error es demasiado largo')
];

export { crearRules, estadoRules };
