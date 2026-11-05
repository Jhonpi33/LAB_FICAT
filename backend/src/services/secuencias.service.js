import crypto from 'crypto';
import Secuencia from '../models/Secuencia.js';

/**
 * Incrementa atómicamente un consecutivo y devuelve el nuevo valor.
 * El $inc con upsert evita condiciones de carrera.
 */
async function siguienteSecuencia(tipo, anio) {
  const doc = await Secuencia.findOneAndUpdate(
    { tipo, anio },
    { $inc: { secuencia: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return doc.secuencia;
}

/**
 * Genera el código interno de muestra con formato consecutivo-año
 * (RF-026, RF-027): '0042-2026'.
 */
export async function generarCodigoMuestra() {
  const anio = new Date().getFullYear();
  const numero = await siguienteSecuencia('muestras', anio);
  return `${String(numero).padStart(4, '0')}-${anio}`;
}

/**
 * Genera el código de seguimiento público (RF-075): 32 caracteres
 * hexadecimales aleatorios, no predecibles.
 */
export function generarCodigoSeguimiento() {
  return crypto.randomBytes(16).toString('hex');
}

/** Genera el número consecutivo de cotización (ej. 42). */
export async function generarNumeroCotizacion() {
  const anio = new Date().getFullYear();
  return siguienteSecuencia('cotizaciones', anio);
}

/** Genera la referencia de pago (ej. PAGO-2026-0001). */
export async function generarReferenciaPago() {
  const anio = new Date().getFullYear();
  const numero = await siguienteSecuencia('pagos', anio);
  return `PAGO-${anio}-${String(numero).padStart(4, '0')}`;
}

/** Genera el número de informe (ej. INF-2026-0001). */
export async function generarNumeroInforme() {
  const anio = new Date().getFullYear();
  const numero = await siguienteSecuencia('informes', anio);
  return `INF-${anio}-${String(numero).padStart(4, '0')}`;
}

/** Genera el número de factura (ej. FAC-2026-0001). */
export async function generarNumeroFactura() {
  const anio = new Date().getFullYear();
  const numero = await siguienteSecuencia('facturas', anio);
  return `FAC-${anio}-${String(numero).padStart(4, '0')}`;
}
