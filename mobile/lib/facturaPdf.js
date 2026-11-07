// ============================================================
//  FACTURA EN PDF
//  1. Armamos la factura como HTML.
//  2. En el celular: expo-print convierte ese HTML en un archivo PDF
//     y expo-sharing abre el menú del teléfono para guardarlo o compartirlo.
//  3. En el navegador: se abre el diálogo de imprimir -> "Guardar como PDF".
// ============================================================
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { TIENDA } from './config';
import { dinero, fecha } from './formato';

// Evita que un nombre con "<" o "&" rompa el HTML
const esc = (texto) =>
  String(texto ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function htmlFactura(pedido) {
  const filas = pedido.items
    .map(
      (item) => `
      <tr>
        <td>${esc(item.nombre)}</td>
        <td class="centro">${esc(item.talla || '-')}</td>
        <td class="centro">${item.cantidad}</td>
        <td class="derecha">${dinero(item.precio)}</td>
        <td class="derecha">${dinero(item.precio * item.cantidad)}</td>
      </tr>`
    )
    .join('');

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Factura ${esc(pedido.numero_factura)}</title>
      <style>
        @page { margin: 12mm; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: Helvetica, Arial, sans-serif; color: #2d2d2d; padding: 32px; }
        .cabecera { display: flex; justify-content: space-between; border-bottom: 3px solid #7b3fa0; padding-bottom: 16px; }
        h1 { color: #7b3fa0; margin: 0; }
        .gris { color: #777; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        th { background: #7b3fa0; color: white; padding: 8px; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        .centro { text-align: center; } .derecha { text-align: right; }
        .totales { margin-top: 16px; width: 280px; margin-left: auto; }
        .totales div { display: flex; justify-content: space-between; padding: 4px 0; }
        .total { font-size: 20px; font-weight: bold; color: #7b3fa0; border-top: 2px solid #7b3fa0; }
      </style>
    </head>
    <body>
      <div class="cabecera">
        <div>
          <h1>${TIENDA.nombre}</h1>
          <div class="gris">NIT: ${TIENDA.nit}</div>
          <div class="gris">${TIENDA.direccion} · ${TIENDA.telefono}</div>
        </div>
        <div style="text-align:right">
          <h2 style="margin:0">FACTURA</h2>
          <div><b>${pedido.numero_factura}</b></div>
          <div class="gris">${fecha(pedido.fecha)}</div>
        </div>
      </div>

      <p><b>Cliente:</b> ${esc(pedido.cliente_nombre)}<br/>
         <b>Email:</b> ${esc(pedido.cliente_email)}<br/>
         <b>Pago:</b> ${pedido.metodo_pago} · Ref. ${pedido.referencia_pago}</p>

      <table>
        <tr><th>Producto</th><th class="centro">Talla</th><th class="centro">Cant.</th>
            <th class="derecha">Precio</th><th class="derecha">Importe</th></tr>
        ${filas}
      </table>

      <div class="totales">
        <div><span>Subtotal</span><span>${dinero(pedido.subtotal)}</span></div>
        <div><span>IVA</span><span>${dinero(pedido.impuesto)}</span></div>
        <div class="total"><span>Total</span><span>${dinero(pedido.total)}</span></div>
      </div>

      <p class="gris" style="margin-top:40px">Pago simulado con fines académicos. ¡Gracias por tu compra!</p>
    </body>
  </html>`;
}

// En el navegador expo-print no usa nuestro HTML (imprime la pantalla de la app).
// Por eso cargamos la factura en un <iframe> invisible e imprimimos solo ese iframe.
// El usuario elige "Guardar como PDF" en el diálogo del navegador.
function imprimirEnNavegador(html) {
  const marco = document.createElement('iframe');
  marco.style.cssText = 'position:fixed;width:0;height:0;border:0;';
  document.body.appendChild(marco);

  const doc = marco.contentDocument;
  doc.open();
  doc.write(html);
  doc.close();

  marco.contentWindow.focus();
  marco.contentWindow.print(); // espera hasta que el usuario cierre el diálogo
  setTimeout(() => marco.remove(), 1000);
}

export async function descargarFacturaPdf(pedido) {
  if (Platform.OS === 'web') {
    imprimirEnNavegador(htmlFactura(pedido));
    return null;
  }

  const { uri } = await Print.printToFileAsync({ html: htmlFactura(pedido) });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: `Factura ${pedido.numero_factura}`,
    });
  }
  return uri;
}
