const { body } = require('express-validator');

const nombreRule = body('nombre')
  .trim()
  .notEmpty()
  .withMessage('El nombre es obligatorio')
  .isLength({ max: 100 })
  .withMessage('El nombre no puede superar 100 caracteres');

const descripcionRule = body('descripcion')
  .trim()
  .notEmpty()
  .withMessage('La descripcion es obligatoria')
  .isLength({ max: 2000 })
  .withMessage('La descripcion no puede superar 2000 caracteres');

const precioRule = body('precio')
  .isFloat({ min: 0 })
  .withMessage('El precio debe ser un numero mayor o igual a 0');

const unidadRule = body('unidad')
  .optional({ nullable: true })
  .trim()
  .isLength({ max: 20 })
  .withMessage('La unidad no puede superar 20 caracteres');

const activoRule = body('activo')
  .optional({ nullable: true })
  .isBoolean()
  .withMessage('El campo activo debe ser booleano');

const crearRules = [nombreRule, descripcionRule, precioRule, unidadRule, activoRule];

const editarRules = [nombreRule, descripcionRule, precioRule, unidadRule, activoRule];

const estadoRules = [
  body('activo')
    .isBoolean()
    .withMessage('El campo activo debe ser booleano')
];

module.exports = { crearRules, editarRules, estadoRules };
