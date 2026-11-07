// ============================================================
//  PAGO SIMULADO (no hay pasarela real, no se cobra nada)
//
//  Reglas para la demo:
//   - La tarjeta debe tener 16 dígitos, el CVV 3 y el vencimiento MM/AA.
//   - Si la tarjeta termina en 0000 el pago se RECHAZA (para probar errores).
//   - Cualquier otra tarjeta válida se APRUEBA.
//
//  Nunca se guarda el número completo: solo los últimos 4 dígitos.
// ============================================================
function simularPago(pago = {}) {
  const titular = (pago.titular || '').trim();
  const numero = (pago.numeroTarjeta || '').replace(/\s/g, '');
  const vencimiento = (pago.vencimiento || '').trim();
  const cvv = (pago.cvv || '').trim();

  if (!titular) return { aprobado: false, mensaje: 'Escribe el nombre del titular' };
  if (!/^\d{16}$/.test(numero)) return { aprobado: false, mensaje: 'La tarjeta debe tener 16 dígitos' };
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(vencimiento)) return { aprobado: false, mensaje: 'El vencimiento debe tener formato MM/AA' };
  if (!/^\d{3}$/.test(cvv)) return { aprobado: false, mensaje: 'El CVV debe tener 3 dígitos' };

  if (numero.endsWith('0000')) {
    return { aprobado: false, mensaje: 'Pago rechazado: fondos insuficientes (simulado)' };
  }

  return {
    aprobado: true,
    metodo: `Tarjeta **** ${numero.slice(-4)}`,
    referencia: 'AUT-' + Math.floor(100000 + Math.random() * 900000),
  };
}

module.exports = simularPago;
