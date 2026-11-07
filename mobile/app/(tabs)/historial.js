// Pestaña MIS COMPRAS (ruta "/historial")
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Encabezado from '../../components/Encabezado';
import Fondo from '../../components/Fondo';
import Tarjeta from '../../components/Tarjeta';
import { obtenerHistorial } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { guardarCache, leerCache } from '../../lib/db';
import { dinero, fecha } from '../../lib/formato';
import { colores } from '../../lib/tema';

export default function Historial() {
  const { sesion, cerrarSesion } = useAuth();
  const [pedidos, setPedidos] = useState(() => leerCache('historial') || []);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState('');

  async function cargar() {
    setCargando(true);
    setAviso('');
    try {
      const lista = await obtenerHistorial(sesion.token);
      setPedidos(lista);
      guardarCache('historial', lista);
    } catch (e) {
      if (e.status === 401) return cerrarSesion();
      setAviso('Sin conexión: mostrando compras guardadas en el teléfono');
    } finally {
      setCargando(false);
    }
  }

  // Recargamos cada vez que se abre la pestaña (por si hay compras nuevas)
  useFocusEffect(useCallback(() => { cargar(); }, []));

  const totalGastado = pedidos.reduce((s, p) => s + p.total, 0);

  return (
    <Fondo>
      <Encabezado
        titulo="Mis compras"
        subtitulo={`${pedidos.length} compra(s) · ${dinero(totalGastado)}`}
      />
      {aviso ? <Text style={estilos.aviso}>{aviso}</Text> : null}

      <FlatList
        data={pedidos}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={estilos.lista}
        refreshing={cargando}
        onRefresh={cargar}
        ListEmptyComponent={
          !cargando ? (
            <Tarjeta style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 50 }}>🧾</Text>
              <Text style={estilos.texto}>Aún no tienes compras</Text>
            </Tarjeta>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/factura/${item.id}`)}>
            <Tarjeta style={estilos.item}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.factura}>{item.numero_factura}</Text>
                <Text style={estilos.suave}>{fecha(item.fecha)}</Text>
                <Text style={estilos.suave}>{item.articulos} artículo(s) · {item.metodo_pago}</Text>
              </View>
              <Text style={estilos.total}>{dinero(item.total)}</Text>
              <Text style={estilos.flecha}>›</Text>
            </Tarjeta>
          </Pressable>
        )}
      />
    </Fondo>
  );
}

const estilos = StyleSheet.create({
  lista: { paddingHorizontal: 20, paddingBottom: 120, gap: 12 },
  aviso: { color: colores.texto, backgroundColor: 'rgba(0,0,0,0.25)', marginHorizontal: 20, padding: 10, borderRadius: 12, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center' },
  factura: { color: colores.texto, fontWeight: '800', fontSize: 16 },
  texto: { color: colores.texto, fontSize: 16, marginTop: 8 },
  suave: { color: colores.textoSuave, fontSize: 13, marginTop: 2 },
  total: { color: colores.acento, fontWeight: '800', fontSize: 17 },
  flecha: { color: colores.textoSuave, fontSize: 28, marginLeft: 8 },
});
