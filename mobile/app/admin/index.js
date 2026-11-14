// PANEL DE ADMINISTRACIÓN (ruta "/admin", solo rol "admin")
// Resumen de la tienda y gestión del estado de los pedidos.
import { useFocusEffect } from 'expo-router';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Boton from '../../components/Boton';
import Encabezado from '../../components/Encabezado';
import EstadoPedido from '../../components/EstadoPedido';
import Fondo from '../../components/Fondo';
import Tarjeta from '../../components/Tarjeta';
import { cambiarEstadoPedido, obtenerPedidosAdmin, obtenerProductos } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { dinero, fecha } from '../../lib/formato';
import { colores } from '../../lib/tema';

const ESTADOS = ['pagado', 'enviado', 'entregado', 'cancelado'];

export default function PanelAdmin() {
  const { sesion, cerrarSesion } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState('');

  async function cargar() {
    setError('');
    try {
      const [p, prods] = await Promise.all([obtenerPedidosAdmin(sesion.token), obtenerProductos()]);
      setPedidos(p);
      setProductos(prods);
    } catch (e) {
      if (e.status === 401) return cerrarSesion();
      setError(e.message);
    }
  }
  useFocusEffect(useCallback(() => { cargar(); }, []));

  async function cambiarEstado(pedido, estado) {
    try {
      await cambiarEstadoPedido(sesion.token, pedido.id, estado);
      cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  // Resumen calculado con los datos ya cargados
  const ventas = pedidos.filter((p) => p.estado !== 'cancelado').reduce((s, p) => s + p.total, 0);
  const agotados = productos.filter((p) => p.stock === 0).length;

  return (
    <Fondo>
      <Encabezado titulo="Administración" subtitulo="Resumen de la tienda" onVolver={() => router.back()} />

      <FlatList
        data={pedidos}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={estilos.lista}
        onRefresh={cargar}
        refreshing={false}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 6 }}>
            <View style={estilos.filaResumen}>
              <Resumen titulo="Ventas" valor={dinero(ventas)} />
              <Resumen titulo="Pedidos" valor={String(pedidos.length)} />
              <Resumen titulo="Agotados" valor={String(agotados)} alerta={agotados > 0} />
            </View>
            <Boton
              titulo="Administrar productos"
              icono="pricetags-outline"
              onPress={() => router.push('/admin/productos')}
            />
            <Boton
              titulo="Carrusel de inicio"
              icono="images-outline"
              variante="vidrio"
              onPress={() => router.push('/admin/banners')}
            />
            {error ? <Text style={estilos.error}>{error}</Text> : null}
            <Text style={estilos.seccion}>Pedidos</Text>
          </View>
        }
        ListEmptyComponent={<Text style={estilos.suave}>Aún no hay pedidos</Text>}
        renderItem={({ item }) => (
          <Tarjeta style={{ marginBottom: 12 }}>
            <View style={estilos.filaPedido}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.factura}>{item.numero_factura} · {dinero(item.total)}</Text>
                <Text style={estilos.suave}>{item.cliente_nombre} · {fecha(item.fecha)}</Text>
              </View>
              <EstadoPedido estado={item.estado} />
            </View>
            {/* Tocar un estado lo asigna al pedido */}
            <View style={estilos.estados}>
              {ESTADOS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => cambiarEstado(item, e)}
                  style={[estilos.estadoBoton, item.estado === e && estilos.estadoActivo]}
                >
                  <Text style={[estilos.estadoTexto, item.estado === e && { color: colores.botonTexto }]}>{e}</Text>
                </Pressable>
              ))}
            </View>
          </Tarjeta>
        )}
      />
    </Fondo>
  );
}

function Resumen({ titulo, valor, alerta }) {
  return (
    <Tarjeta style={estilos.resumen}>
      <Text style={[estilos.resumenValor, alerta && { color: colores.error }]} numberOfLines={1}>{valor}</Text>
      <Text style={estilos.suave}>{titulo}</Text>
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  lista: { paddingHorizontal: 20, paddingBottom: 40 },
  filaResumen: { flexDirection: 'row', gap: 10 },
  resumen: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8 },
  resumenValor: { color: colores.texto, fontSize: 16, fontWeight: '700' },
  seccion: { color: colores.textoSuave, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 6 },
  filaPedido: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  factura: { color: colores.texto, fontWeight: '600', fontSize: 14 },
  suave: { color: colores.textoSuave, fontSize: 12, marginTop: 2 },
  estados: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  estadoBoton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colores.vidrio,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  estadoActivo: { backgroundColor: colores.botonFondo, borderColor: 'transparent' },
  estadoTexto: { color: colores.textoSuave, fontSize: 12, fontWeight: '600' },
  error: { color: colores.error, backgroundColor: colores.errorFondo, padding: 10, borderRadius: 12, fontSize: 13 },
});
