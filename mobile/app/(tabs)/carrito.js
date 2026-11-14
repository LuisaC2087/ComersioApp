// Pestaña CARRITO (ruta "/carrito"). El carrito vive en SQLite.
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Boton from '../../components/Boton';
import Encabezado from '../../components/Encabezado';
import Fondo from '../../components/Fondo';
import ImagenProducto from '../../components/ImagenProducto';
import Tarjeta from '../../components/Tarjeta';
import { IVA } from '../../lib/config';
import { cambiarCantidad, leerCarrito } from '../../lib/db';
import { dinero } from '../../lib/formato';
import { colores } from '../../lib/tema';

export default function Carrito() {
  const [items, setItems] = useState([]);

  // Cada vez que se abre esta pestaña, leemos el carrito de SQLite
  const recargar = () => setItems(leerCarrito());
  useFocusEffect(useCallback(recargar, []));

  function cambiar(item, nuevaCantidad) {
    cambiarCantidad(item.producto_id, item.talla, nuevaCantidad);
    recargar();
  }

  const subtotal = items.reduce((suma, i) => suma + i.precio * i.cantidad, 0);
  const impuesto = subtotal * IVA;

  return (
    <Fondo>
      <Encabezado titulo="Carrito" subtitulo={`${items.length} producto(s)`} />

      <FlatList
        data={items}
        keyExtractor={(i) => `${i.producto_id}-${i.talla}`}
        contentContainerStyle={estilos.lista}
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
              <Pressable onPress={() => cambiar(item, item.cantidad - 1)} style={estilos.mini} hitSlop={6}>
                <Ionicons name={item.cantidad === 1 ? 'trash-outline' : 'remove'} size={15} color={colores.texto} />
              </Pressable>
              <Text style={estilos.cantidad}>{item.cantidad}</Text>
              <Pressable onPress={() => cambiar(item, item.cantidad + 1)} style={estilos.mini} hitSlop={6}>
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
