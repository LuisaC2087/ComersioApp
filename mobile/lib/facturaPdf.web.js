// ============================================================
//  FACTURA EN PDF — VERSIÓN NAVEGADOR
//
//  Expo usa este archivo en la web y "facturaPdf.js" en el celular.
//  Aquí dibujamos la factura con jsPDF y el navegador DESCARGA el archivo
//  (funciona en computadora y en el navegador del celular).
//
//  Medidas en milímetros sobre una hoja A4 (210 x 297).
// ============================================================
import { jsPDF } from 'jspdf';
import { TIENDA } from './config';
import { dinero, fecha } from './formato';

const MORADO = [123, 63, 160];
const GRIS = [110, 110, 110];
const TEXTO = [45, 45, 45];

const IZQ = 15; // margen izquierdo
const DER = 195; // margen derecho

export async function descargarFacturaPdf(pedido) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 20; // posición vertical actual

  // ---------- Cabecera ----------
  pdf.setTextColor(...MORADO);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.text(TIENDA.nombre, IZQ, y);
  pdf.setFontSize(16);
  pdf.text('FACTURA', DER, y, { align: 'right' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(...GRIS);
  y += 7;
  pdf.text(`NIT: ${TIENDA.nit}`, IZQ, y);
  pdf.text(pedido.numero_factura, DER, y, { align: 'right' });
  y += 5;
  pdf.text(`${TIENDA.direccion} - ${TIENDA.telefono}`, IZQ, y);
  pdf.text(fecha(pedido.fecha), DER, y, { align: 'right' });

  y += 4;
  pdf.setDrawColor(...MORADO);
  pdf.setLineWidth(0.8);
  pdf.line(IZQ, y, DER, y);

  // ---------- Cliente ----------
  y += 10;
  pdf.setTextColor(...TEXTO);
  pdf.setFontSize(11);
  pdf.text(`Cliente: ${pedido.cliente_nombre}`, IZQ, y);
  y += 6;
  pdf.text(`Email: ${pedido.cliente_email}`, IZQ, y);
  y += 6;
  pdf.text(`Pago: ${pedido.metodo_pago} - Ref. ${pedido.referencia_pago}`, IZQ, y);

  // ---------- Tabla de productos ----------
  y += 10;
  pdf.setFillColor(...MORADO);
  pdf.rect(IZQ, y - 5.5, DER - IZQ, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Producto', IZQ + 2, y);
  pdf.text('Talla', 115, y, { align: 'center' });
  pdf.text('Cant.', 135, y, { align: 'center' });
  pdf.text('Precio', 165, y, { align: 'right' });
  pdf.text('Importe', DER - 2, y, { align: 'right' });

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...TEXTO);
  pdf.setDrawColor(230, 230, 230);
  pdf.setLineWidth(0.2);

  for (const item of pedido.items) {
    y += 9;
    if (y > 270) {
      // Si no cabe, pasamos a una hoja nueva
      pdf.addPage();
      y = 20;
    }
    pdf.text(item.nombre, IZQ + 2, y);
    pdf.text(String(item.talla || '-'), 115, y, { align: 'center' });
    pdf.text(String(item.cantidad), 135, y, { align: 'center' });
    pdf.text(dinero(item.precio), 165, y, { align: 'right' });
    pdf.text(dinero(item.precio * item.cantidad), DER - 2, y, { align: 'right' });
    pdf.line(IZQ, y + 3, DER, y + 3);
  }

  // ---------- Totales ----------
  y += 12;
  const fila = (texto, valor) => {
    pdf.text(texto, 140, y);
    pdf.text(valor, DER - 2, y, { align: 'right' });
    y += 7;
  };
  fila('Subtotal', dinero(pedido.subtotal));
  fila('IVA', dinero(pedido.impuesto));

  pdf.setDrawColor(...MORADO);
  pdf.setLineWidth(0.6);
  pdf.line(138, y - 4, DER, y - 4);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(...MORADO);
  fila('Total', dinero(pedido.total));

  // ---------- Pie ----------
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...GRIS);
  pdf.text('Pago simulado con fines académicos. ¡Gracias por tu compra!', IZQ, y + 15);

  // Descarga el archivo (en el celular aparece en "Descargas")
  pdf.save(`Factura-${pedido.numero_factura}.pdf`);
  return null;
}
