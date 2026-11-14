// FACTURA (ruta "/factura/12", o "/factura/12?nuevo=1" justo después de pagar)
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Boton from '../../components/Boton';
import Encabezado from '../../components/Encabezado';
import EstadoPedido from '../../components/EstadoPedido';
import Fondo from '../../components/Fondo';
import Tarjeta from '../../components/Tarjeta';
import { obtenerPedido } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { TIENDA } from '../../lib/config';
import { guardarCache, leerCache } from '../../lib/db';
import { descargarFacturaPdf, imprimirFactura } from '../../lib/facturaPdf';
import { dinero, fecha } from '../../lib/formato';
import { colores } from '../../lib/tema';

export default function Factura() {
  const { sesion } = useAuth();
  const { id, nuevo } = useLocalSearchParams();
  // Mientras llega la respuesta del servidor, mostramos la copia local (si existe)
  const [pedido, setPedido] = useState(() => leerCache(`pedido-${id}`));
  const [error, setError] = useState('');
  const [generando, setGenerando] = useState(false);

  // Siempre consultamos la base de datos; la copia local solo sirve sin internet
  useEffect(() => {
    obtenerPedido(sesion.token, id)
      .then((datos) => {
        setPedido(datos);
        guardarCache(`pedido-${id}`, datos);
      })
      .catch((e) => {
        if (!pedido) setError(e.message);
      });
  }, [id]);

  async function ejecutar(accion) {
    setError('');
    setGenerando(true);
    try {
      await accion(pedido);
    } catch (e) {
      setError('No se pudo generar el PDF: ' + e.message);
    } finally {
      setGenerando(false);
    }
  }

  return (
    <Fondo>
      <Encabezado titulo="Factura" subtitulo={pedido?.numero_factura} onVolver={() => router.back()} />

      {!pedido ? (
        error ? <Text style={estilos.error}>{error}</Text> : <ActivityIndicator color={colores.texto} size="large" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }}>
          {nuevo ? (
            <Tarjeta style={{ alignItems: 'center', paddingVertical: 26 }}>
              <Ionicons name="checkmark-circle-outline" size={44} color={colores.exito} />
              <Text style={estilos.exito}>Pago aprobado</Text>
              <Text style={estilos.suave}>Referencia {pedido.referencia_pago}</Text>
            </Tarjeta>
          ) : null}

          <Tarjeta>
            <View style={estilos.cabecera}>
              <Text style={estilos.tienda}>{TIENDA.nombre}</Text>
              <EstadoPedido estado={pedido.estado} />
            </View>
            <Text style={estilos.suave}>NIT {TIENDA.nit} · {TIENDA.direccion}</Text>

            <View style={estilos.separador} />
            <Fila texto="Factura" valor={pedido.numero_factura} />
            <Fila texto="Fecha" valor={fecha(pedido.fecha)} />
            <Fila texto="Cliente" valor={pedido.cliente_nombre} />
            <Fila texto="Pago" valor={pedido.metodo_pago} />

            <View style={estilos.separador} />
            {pedido.items.map((item) => (
              <View key={item.id} style={estilos.item}>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.texto}>{item.nombre}</Text>
                  <Text style={estilos.suave}>
                    Talla {item.talla} · {item.cantidad} × {dinero(item.precio)}
                  </Text>
                </View>
                <Text style={estilos.texto}>{dinero(item.precio * item.cantidad)}</Text>
              </View>
            ))}

            <View style={estilos.separador} />
            <Fila texto="Subtotal" valor={dinero(pedido.subtotal)} />
            <Fila texto="IVA" valor={dinero(pedido.impuesto)} />
            <Fila texto="Total" valor={dinero(pedido.total)} grande />
          </Tarjeta>

          <Boton
            titulo="Descargar PDF"
            icono="download-outline"
            onPress={() => ejecutar(descargarFacturaPdf)}
            cargando={generando}
          />
          <Boton
            titulo="Imprimir"
            icono="print-outline"
            variante="vidrio"
            onPress={() => ejecutar(imprimirFactura)}
          />
          {error ? <Text style={estilos.error}>{error}</Text> : null}
          {nuevo ? (
            <Boton titulo="Seguir comprando" variante="vidrio" onPress={() => router.navigate('/')} />
          ) : null}
        </ScrollView>
      )}
    </Fondo>
  );
}

function Fila({ texto, valor, grande }) {
  return (
    <View style={estilos.fila}>
      <Text style={[grande ? estilos.grande : estilos.suave]}>{texto}</Text>
      <Text style={[grande ? estilos.grande : estilos.texto]}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tienda: { color: colores.texto, fontSize: 20, fontWeight: '700' },
  texto: { color: colores.texto, fontSize: 14 },
  suave: { color: colores.textoSuave, fontSize: 12, marginTop: 2 },
  exito: { color: colores.exito, fontSize: 19, fontWeight: '700', marginTop: 8 },
  separador: { height: 1, backgroundColor: colores.borde, marginVertical: 14 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  grande: { fontSize: 18, fontWeight: '700', color: colores.texto, marginTop: 4 },
  error: { color: colores.error, textAlign: 'center', margin: 10, fontSize: 13 },
});
