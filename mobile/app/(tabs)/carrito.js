// Pestaña CARRITO (ruta "/carrito")
// El carrito vive en el servidor: lo que hay aquí está APARTADO (descontado
// del stock). Al bajar la cantidad o quitar un producto, vuelve al stock.
// Se guarda una copia en SQLite para verlo sin internet.
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Boton from '../../components/Boton';
import Encabezado from '../../components/Encabezado';
import Fondo from '../../components/Fondo';
import ImagenProducto from '../../components/ImagenProducto';
import Tarjeta from '../../components/Tarjeta';
import { cambiarCantidadCarrito, obtenerCarrito } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { IVA } from '../../lib/config';
import { guardarCache, leerCache } from '../../lib/db';
import { dinero, hora } from '../../lib/formato';
import { colores } from '../../lib/tema';

const VACIO = { items: [], venceEn: null };

export default function Carrito() {
  const { sesion, cerrarSesion } = useAuth();
  const [carrito, setCarrito] = useState(() => leerCache('carrito') || VACIO);
  const [ocupado, setOcupado] = useState(false); // evita tocar +/- dos veces seguidas
  const [aviso, setAviso] = useState('');

  function mostrar(nuevo) {
    setCarrito(nuevo);
    guardarCache('carrito', nuevo);
  }

  function manejarError(e) {
    if (e.status === 401) return cerrarSesion();
    setAviso(e.message);
  }

  // Cada vez que se abre esta pestaña, pedimos el carrito al servidor
  async function cargar() {
    setAviso('');
    try {
      mostrar(await obtenerCarrito(sesion.token));
    } catch (e) {
      manejarError(e);
    }
  }
  useFocusEffect(useCallback(() => { cargar(); }, []));

  // + / − / quitar: el servidor reserva o devuelve la diferencia de stock
  async function cambiar(item, nuevaCantidad) {
    setAviso('');
    setOcupado(true);
    try {
      mostrar(await cambiarCantidadCarrito(sesion.token, item.producto_id, item.talla, nuevaCantidad));
    } catch (e) {
      manejarError(e); // ej. "Solo quedan 2 unidades..."
    } finally {
      setOcupado(false);
    }
  }

  const items = carrito.items;
  const subtotal = items.reduce((suma, i) => suma + i.precio * i.cantidad, 0);
  const impuesto = subtotal * IVA;

  return (
    <Fondo>
      <Encabezado titulo="Carrito" subtitulo={`${items.length} producto(s)`} />

      {aviso ? <Text style={estilos.aviso}>{aviso}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(i) => `${i.producto_id}-${i.talla}`}
        contentContainerStyle={estilos.lista}
        refreshing={false}
        onRefresh={cargar}
        ListHeaderComponent={
          carrito.venceEn ? (
            <View style={estilos.reserva}>
              <Ionicons name="time-outline" size={16} color={colores.acento} />
              <Text style={estilos.reservaTexto}>
                Apartado para ti hasta las {hora(carrito.venceEn)}. Después vuelve al stock.
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Tarjeta style={{ alignItems: 'center', paddingVertical: 42 }}>
            <Ionicons name="cart-outline" size={42} color={colores.textoSuave} />
            <Text style={estilos.vacio}>Tu carrito está vacío</Text>
            <Boton titulo="Ir al catálogo" variante="vidrio" onPress={() => router.navigate('/')} style={{ marginTop: 18 }} />
          </Tarjeta>
        }
        renderItem={({ item }) => (
          <Tarjeta style={estilos.item}>
            <ImagenProducto producto={item} estilo={{ width: 56, height: 56 }} icono={24} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={estilos.nombre}>{item.nombre}</Text>
              <Text style={estilos.detalle}>Talla {item.talla} · {dinero(item.precio)}</Text>
              <Text style={estilos.importe}>{dinero(item.precio * item.cantidad)}</Text>
            </View>
            <View style={estilos.contador}>
              <Pressable disabled={ocupado} onPress={() => cambiar(item, item.cantidad - 1)} style={estilos.mini} hitSlop={6}>
                <Ionicons name={item.cantidad === 1 ? 'trash-outline' : 'remove'} size={15} color={colores.texto} />
              </Pressable>
              <Text style={estilos.cantidad}>{item.cantidad}</Text>
              <Pressable disabled={ocupado} onPress={() => cambiar(item, item.cantidad + 1)} style={estilos.mini} hitSlop={6}>
                <Ionicons name="add" size={15} color={colores.texto} />
              </Pressable>
            </View>
          </Tarjeta>
        )}
        ListFooterComponent={
          items.length > 0 ? (
            <Tarjeta style={{ marginTop: 4 }}>
              <Fila texto="Subtotal" valor={dinero(subtotal)} />
              <Fila texto={`IVA (${IVA * 100}%)`} valor={dinero(impuesto)} />
              <Fila texto="Total" valor={dinero(subtotal + impuesto)} grande />
              <Boton titulo="Ir a pagar" icono="card-outline" onPress={() => router.push('/pago')} style={{ marginTop: 14 }} />
            </Tarjeta>
          ) : null
        }
      />
    </Fondo>
  );
}

function Fila({ texto, valor, grande }) {
  return (
    <View style={estilos.fila}>
      <Text style={[grande ? estilos.grande : estilos.filaTexto]}>{texto}</Text>
      <Text style={[grande ? estilos.grande : estilos.filaValor]}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  lista: { paddingHorizontal: 20, paddingBottom: 120, gap: 12 },
  aviso: { color: colores.error, backgroundColor: colores.errorFondo, marginHorizontal: 20, padding: 10, borderRadius: 12, marginBottom: 8, fontSize: 13 },
  reserva: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 4 },
  reservaTexto: { color: colores.textoSuave, fontSize: 12, flex: 1 },
  vacio: { color: colores.textoSuave, fontSize: 15, marginTop: 10 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  nombre: { color: colores.texto, fontWeight: '600', fontSize: 14 },
  detalle: { color: colores.textoSuave, fontSize: 12, marginTop: 2 },
  importe: { color: colores.acento, fontWeight: '700', marginTop: 4, fontSize: 13 },
  contador: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mini: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colores.vidrioFuerte,
    borderWidth: 1,
    borderColor: colores.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cantidad: { color: colores.texto, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  filaTexto: { color: colores.textoSuave, fontSize: 14 },
  filaValor: { color: colores.texto, fontSize: 14 },
  grande: { fontSize: 18, fontWeight: '700', color: colores.texto, marginTop: 4 },
});
