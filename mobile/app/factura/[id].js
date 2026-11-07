// FACTURA (ruta "/factura/12", o "/factura/12?nuevo=1" justo después de pagar)
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Boton from '../../components/Boton';
import Encabezado from '../../components/Encabezado';
import Fondo from '../../components/Fondo';
import Tarjeta from '../../components/Tarjeta';
import { obtenerPedido } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { TIENDA } from '../../lib/config';
import { guardarCache, leerCache } from '../../lib/db';
import { descargarFacturaPdf } from '../../lib/facturaPdf';
import { dinero, fecha } from '../../lib/formato';
import { colores } from '../../lib/tema';

export default function Factura() {
  const { sesion } = useAuth();
  const { id, nuevo } = useLocalSearchParams();
  // Primero buscamos la factura en SQLite; si no está, la pedimos al servidor
  const [pedido, setPedido] = useState(() => leerCache(`pedido-${id}`));
  const [error, setError] = useState('');
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    if (pedido) return;
    obtenerPedido(sesion.token, id)
      .then((datos) => {
        setPedido(datos);
        guardarCache(`pedido-${id}`, datos);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function descargar() {
    setGenerando(true);
    try {
      await descargarFacturaPdf(pedido);
    } catch (e) {
      Alert.alert('No se pudo generar el PDF', e.message);
    } finally {
      setGenerando(false);
    }
  }

  return (
    <Fondo>
      <Encabezado titulo="Factura" subtitulo={pedido?.numero_factura} onVolver={() => router.back()} />

      {!pedido ? (
        error ? <Text style={estilos.error}>{error}</Text> : <ActivityIndicator color="#fff" size="large" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
          {nuevo ? (
            <Tarjeta style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 44 }}>✅</Text>
              <Text style={estilos.exito}>¡Pago aprobado!</Text>
              <Text style={estilos.suave}>Referencia {pedido.referencia_pago}</Text>
            </Tarjeta>
          ) : null}

          <Tarjeta>
            <Text style={estilos.tienda}>{TIENDA.nombre}</Text>
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

          <Boton titulo="📄 Descargar PDF" onPress={descargar} cargando={generando} />
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
      <Text style={[estilos.suave, grande && estilos.grande]}>{texto}</Text>
      <Text style={[estilos.texto, grande && estilos.grande]}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tienda: { color: colores.texto, fontSize: 22, fontWeight: '800' },
  texto: { color: colores.texto, fontSize: 15 },
  suave: { color: colores.textoSuave, fontSize: 13 },
  exito: { color: colores.exito, fontSize: 22, fontWeight: '800', marginTop: 4 },
  separador: { height: 1, backgroundColor: colores.borde, marginVertical: 12 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  grande: { fontSize: 20, fontWeight: '800', color: colores.acento },
  error: { color: colores.error, textAlign: 'center', margin: 20 },
});
