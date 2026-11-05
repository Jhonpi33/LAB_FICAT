/**
 * Cliente de FACTUS en MODO SANDBOX (RNF-017).
 *
 * Cómo funciona: Factus es el proveedor de facturación electrónica colombiana.
 * Este cliente SIMULA la petición y la respuesta del sandbox (nunca se llama a
 * producción). La respuesta simulada se guarda en facturas.documento, que
 * NUNCA se expone al cliente (RF-082).
 */
export async function emitirFacturaSandbox({ numero, valor_total, cliente_nombre }) {
  // Simula la latencia de la red hacia Factus.
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    sandbox: true,
    numero_documento: `FE-SANDBOX-${numero}`,
    valor_total,
    cliente: cliente_nombre,
    fecha: new Date().toISOString(),
    estado: 'validada',
    mensaje: 'Documento validado en el entorno de pruebas de Factus'
  };
}
