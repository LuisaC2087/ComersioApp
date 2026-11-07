// Pestaña CARRITO (ruta "/carrito"). El carrito vive en SQLite.
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
          <Tarjeta style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 50 }}>🛒</Text>
            <Text style={estilos.vacio}>Tu carrito está vacío</Text>
            <Boton titulo="Ir al catálogo" variante="vidrio" onPress={() => router.navigate('/')} style={{ marginTop: 16 }} />
          </Tarjeta>
        }
        renderItem={({ item }) => (
          <Tarjeta style={estilos.item}>
            <ImagenProducto producto={item} tamano={36} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={estilos.nombre}>{item.nombre}</Text>
              <Text style={estilos.detalle}>Talla {item.talla} · {dinero(item.precio)}</Text>
              <Text style={estilos.importe}>{dinero(item.precio * item.cantidad)}</Text>
            </View>
            <View style={estilos.contador}>
              <Pressable onPress={() => cambiar(item, item.cantidad - 1)} style={estilos.mini} hitSlop={6}>
                <Text style={estilos.miniTexto}>{item.cantidad === 1 ? '🗑' : '−'}</Text>
              </Pressable>
              <Text style={estilos.cantidad}>{item.cantidad}</Text>
              <Pressable onPress={() => cambiar(item, item.cantidad + 1)} style={estilos.mini} hitSlop={6}>
                <Text style={estilos.miniTexto}>+</Text>
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
              <Boton titulo="Ir a pagar" onPress={() => router.push('/pago')} style={{ marginTop: 14 }} />
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
      <Text style={[estilos.filaTexto, grande && estilos.grande]}>{texto}</Text>
      <Text style={[estilos.filaTexto, grande && estilos.grande]}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  lista: { paddingHorizontal: 20, paddingBottom: 120, gap: 12 },
  vacio: { color: colores.texto, fontSize: 17, marginTop: 8 },
  item: { flexDirection: 'row', alignItems: 'center' },
  nombre: { color: colores.texto, fontWeight: '700', fontSize: 15 },
  detalle: { color: colores.textoSuave, fontSize: 13 },
  importe: { color: colores.acento, fontWeight: '800', marginTop: 4 },
  contador: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colores.vidrioFuerte,
    borderWidth: 1,
    borderColor: colores.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniTexto: { color: colores.texto, fontSize: 16, fontWeight: '700' },
  cantidad: { color: colores.texto, fontWeight: '800', minWidth: 20, textAlign: 'center' },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  filaTexto: { color: colores.texto, fontSize: 15 },
  grande: { fontSize: 20, fontWeight: '800', color: colores.acento },
});
