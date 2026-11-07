import { MONEDA } from './config';

// 1234.5 -> "Q 1,234.50"
export function dinero(valor) {
  return `${MONEDA} ${Number(valor).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// "2026-11-07T15:30:00Z" -> "07/11/2026 09:30"
export function fecha(texto) {
  const d = new Date(texto);
  const dos = (n) => String(n).padStart(2, '0');
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
}
