// PAGO SIMULADO (ruta "/pago")
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Boton from '../components/Boton';
import Campo from '../components/Campo';
import Encabezado from '../components/Encabezado';
import Fondo from '../components/Fondo';
import Tarjeta from '../components/Tarjeta';
import { crearPedido, obtenerCarrito } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { IVA } from '../lib/config';
import { guardarCache, leerCache } from '../lib/db';
import { dinero } from '../lib/formato';
import { colores } from '../lib/tema';

// "4111111111111111" -> "4111 1111 1111 1111"
const formatearTarjeta = (t) => t.replace(/\D/g, '').slice(0, 16).replace(/(.{4})(?=.)/g, '$1 ');
// "1228" -> "12/28"
const formatearVencimiento = (t) => t.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2');

export default function Pago() {
  const { sesion, cerrarSesion } = useAuth();
  const [titular, setTitular] = useState(sesion.usuario.nombre);
  const [numero, setNumero] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [cvv, setCvv] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  // Mostramos el total del carrito guardado y lo actualizamos desde el servidor
  const [items, setItems] = useState(() => leerCache('carrito')?.items || []);
  useEffect(() => {
    obtenerCarrito(sesion.token).then((c) => setItems(c.items)).catch(() => {});
  }, []);
  const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

  async function pagar() {
    setError('');
    setProcesando(true);
    try {
      // Solo mandamos los datos de la tarjeta: el servidor cobra lo que hay
      // en el carrito (ya reservado) con los precios reales
      const pedido = await crearPedido(sesion.token, {
        titular,
        numeroTarjeta: numero,
        vencimiento,
        cvv,
      });

      guardarCache('carrito', { items: [], venceEn: null });
      guardarCache(`pedido-${pedido.id}`, pedido);
      // "replace" para que al volver no regrese al formulario de pago
      router.replace(`/factura/${pedido.id}?nuevo=1`);
    } catch (e) {
      if (e.status === 401) return cerrarSesion();
      setError(e.message);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <Fondo>
      <Encabezado titulo="Pago" subtitulo="Pago simulado, no se cobra nada" onVolver={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        {/* Tarjeta de crédito de vidrio (solo visual) */}
        <Tarjeta style={estilos.tarjetaCredito}>
          <Ionicons name="card-outline" size={30} color={colores.texto} />
          <Text style={estilos.numero}>{numero || '•••• •••• •••• ••••'}</Text>
          <View style={estilos.filaTarjeta}>
            <Text style={estilos.textoTarjeta}>{titular.toUpperCase() || 'TITULAR'}</Text>
            <Text style={estilos.textoTarjeta}>{vencimiento || 'MM/AA'}</Text>
          </View>
        </Tarjeta>

        <Tarjeta>
          <Campo etiqueta="Titular" value={titular} onChangeText={setTitular} autoCapitalize="words" />
          <Campo
            etiqueta="Número de tarjeta"
            value={numero}
            onChangeText={(t) => setNumero(formatearTarjeta(t))}
            keyboardType="number-pad"
            placeholder="4111 1111 1111 1111"
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Campo
              style={{ flex: 1 }}
              etiqueta="Vence"
              value={vencimiento}
              onChangeText={(t) => setVencimiento(formatearVencimiento(t))}
              keyboardType="number-pad"
              placeholder="MM/AA"
            />
            <Campo
              style={{ flex: 1 }}
              etiqueta="CVV"
              value={cvv}
              onChangeText={(t) => setCvv(t.replace(/\D/g, '').slice(0, 3))}
              keyboardType="number-pad"
              secureTextEntry
              placeholder="123"
            />
          </View>
          <Text style={estilos.nota}>
            Cualquier tarjeta de 16 dígitos es aprobada. Las que terminan en 0000 son rechazadas (para probar errores).
          </Text>
        </Tarjeta>

        {error ? <Text style={estilos.error}>{error}</Text> : null}

        <Boton
          titulo={`Pagar ${dinero(subtotal * (1 + IVA))}`}
          icono="lock-closed-outline"
          onPress={pagar}
          cargando={procesando}
          deshabilitado={items.length === 0}
        />
      </ScrollView>
    </Fondo>
  );
}

const estilos = StyleSheet.create({
  tarjetaCredito: {
    height: 185,
    justifyContent: 'space-between',
    padding: 22,
    backgroundColor: colores.vidrioFuerte,
  },
  numero: { color: colores.texto, fontSize: 21, letterSpacing: 2.5, fontWeight: '600' },
  filaTarjeta: { flexDirection: 'row', justifyContent: 'space-between' },
  textoTarjeta: { color: colores.textoSuave, fontWeight: '600', fontSize: 12, letterSpacing: 1 },
  nota: { color: colores.textoSuave, fontSize: 12, lineHeight: 18 },
  error: { color: colores.error, backgroundColor: colores.errorFondo, padding: 12, borderRadius: 12, textAlign: 'center', fontSize: 13 },
});
