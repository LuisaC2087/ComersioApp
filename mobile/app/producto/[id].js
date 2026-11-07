// DETALLE DE PRODUCTO (ruta "/producto/5")
// El producto se consulta en la base de datos (GET /productos/:id).
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Boton from '../../components/Boton';
import Encabezado from '../../components/Encabezado';
import Fondo from '../../components/Fondo';
import ImagenProducto from '../../components/ImagenProducto';
import Tarjeta from '../../components/Tarjeta';
import { obtenerProducto } from '../../lib/api';
import { agregarAlCarrito, leerCache } from '../../lib/db';
import { dinero } from '../../lib/formato';
import { colores } from '../../lib/tema';

export default function Producto() {
  const { id } = useLocalSearchParams();
  const [producto, setProducto] = useState(null);
  const [talla, setTalla] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [error, setError] = useState('');

  function mostrar(p) {
    setProducto(p);
    setTalla(p.tallas[0]);
  }

  // Consultamos el producto en la base de datos; si no hay internet, usamos la copia local
  useEffect(() => {
    obtenerProducto(id)
      .then(mostrar)
      .catch((e) => {
        const guardado = (leerCache('productos') || []).find((p) => String(p.id) === String(id));
        if (guardado) mostrar(guardado);
        else setError(e.message);
      });
  }, [id]);

  if (!producto) {
    return (
      <Fondo>
        <Encabezado
          titulo={error ? 'Producto no encontrado' : 'Cargando…'}
          subtitulo={error}
          onVolver={() => router.back()}
        />
        {!error ? <ActivityIndicator color="#fff" size="large" /> : null}
      </Fondo>
    );
  }

  function anadir() {
    agregarAlCarrito(producto, talla, cantidad); // se guarda en SQLite

    // En el navegador Alert no tiene botones, usamos confirm()
    if (Platform.OS === 'web') {
      const irAlCarrito = window.confirm(`¡Añadido! ${cantidad} × ${producto.nombre}\n¿Ir al carrito?`);
      return irAlCarrito ? router.navigate('/carrito') : router.back();
    }

    Alert.alert('¡Añadido! 🛒', `${cantidad} × ${producto.nombre} (talla ${talla})`, [
      { text: 'Seguir comprando', onPress: () => router.back() },
      { text: 'Ver carrito', onPress: () => router.navigate('/carrito') },
    ]);
  }

  return (
    <Fondo>
      <Encabezado titulo={producto.nombre} subtitulo={producto.categoria} onVolver={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Tarjeta style={estilos.imagen}>
          <ImagenProducto producto={producto} tamano={110} />
        </Tarjeta>

        <Tarjeta>
          <Text style={estilos.precio}>{dinero(producto.precio)}</Text>
          <Text style={estilos.descripcion}>{producto.descripcion}</Text>

          <Text style={estilos.subtitulo}>Talla</Text>
          <View style={estilos.fila}>
            {producto.tallas.map((t) => (
              <Pressable key={t} onPress={() => setTalla(t)} style={[estilos.opcion, t === talla && estilos.opcionActiva]}>
                <Text style={[estilos.opcionTexto, t === talla && { color: '#3a1c71' }]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={estilos.subtitulo}>Cantidad</Text>
          <View style={estilos.fila}>
            <Pressable onPress={() => setCantidad(Math.max(1, cantidad - 1))} style={estilos.opcion}>
              <Text style={estilos.opcionTexto}>−</Text>
            </Pressable>
            <Text style={estilos.cantidad}>{cantidad}</Text>
            <Pressable onPress={() => setCantidad(cantidad + 1)} style={estilos.opcion}>
              <Text style={estilos.opcionTexto}>+</Text>
            </Pressable>
          </View>
        </Tarjeta>

        <Boton titulo={`Añadir al carrito · ${dinero(producto.precio * cantidad)}`} onPress={anadir} />
      </ScrollView>
    </Fondo>
  );
}

const estilos = StyleSheet.create({
  imagen: { alignItems: 'center', paddingVertical: 36 },
  precio: { color: colores.acento, fontSize: 28, fontWeight: '800' },
  descripcion: { color: colores.texto, fontSize: 15, marginTop: 8, lineHeight: 22 },
  subtitulo: { color: colores.textoSuave, marginTop: 18, marginBottom: 8, fontWeight: '600' },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  opcion: {
    minWidth: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colores.vidrioFuerte,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  opcionActiva: { backgroundColor: colores.acento },
  opcionTexto: { color: colores.texto, fontWeight: '700', fontSize: 16 },
  cantidad: { color: colores.texto, fontSize: 20, fontWeight: '800', minWidth: 40, textAlign: 'center' },
});
