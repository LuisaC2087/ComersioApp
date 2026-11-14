// DETALLE DE PRODUCTO (ruta "/producto/5")
// El producto se consulta en la base de datos (GET /productos/:id).
// Cada talla tiene su propio stock: producto.tallas = [{ talla: 'S', stock: 5 }, ...]
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Boton from '../../components/Boton';
import Encabezado from '../../components/Encabezado';
import Fondo from '../../components/Fondo';
import ImagenProducto from '../../components/ImagenProducto';
import Tarjeta from '../../components/Tarjeta';
import { agregarAlCarrito, obtenerProducto } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { guardarCache, leerCache } from '../../lib/db';
import { dinero } from '../../lib/formato';
import { colores } from '../../lib/tema';

export default function Producto() {
  const { sesion, cerrarSesion } = useAuth();
  const { id } = useLocalSearchParams();
  const [producto, setProducto] = useState(null);
  const [talla, setTalla] = useState(null); // la talla elegida: { talla, stock }
  const [cantidad, setCantidad] = useState(1);
  const [agregando, setAgregando] = useState(false);
  const [error, setError] = useState('');

  function mostrar(p) {
    setProducto(p);
    setCantidad(1);
    // Mantenemos la talla elegida si aún tiene stock; si no, la primera que tenga
    setTalla((anterior) =>
      p.tallas.find((t) => t.talla === anterior?.talla && t.stock > 0) ||
      p.tallas.find((t) => t.stock > 0) ||
      null
    );
  }

  // Consultamos el producto en la base de datos; si no hay internet, usamos la copia local
  function cargar() {
    return obtenerProducto(id)
      .then(mostrar)
      .catch((e) => {
        const guardado = (leerCache('productos') || []).find((p) => String(p.id) === String(id));
        if (guardado) mostrar(guardado);
        else setError(e.message);
      });
  }
  useEffect(() => {
    cargar();
  }, [id]);

  if (!producto) {
    return (
      <Fondo>
        <Encabezado
          titulo={error ? 'Producto no encontrado' : 'Cargando…'}
          subtitulo={error}
          onVolver={() => router.back()}
        />
        {!error ? <ActivityIndicator color={colores.texto} size="large" /> : null}
      </Fondo>
    );
  }

  const agotado = producto.stock === 0;

  function elegirTalla(t) {
    setTalla(t);
    setCantidad(1);
  }

  async function anadir() {
    setError('');
    setAgregando(true);
    try {
      // El servidor aparta (descuenta) estas unidades del stock para este usuario
      const carrito = await agregarAlCarrito(sesion.token, producto.id, talla.talla, cantidad);
      guardarCache('carrito', carrito);
    } catch (e) {
      if (e.status === 401) return cerrarSesion();
      setError(e.message); // por ejemplo: alguien se llevó las últimas unidades
      cargar(); // mostramos el stock actualizado
      return;
    } finally {
      setAgregando(false);
    }

    // En el navegador Alert no tiene botones, usamos confirm()
    if (Platform.OS === 'web') {
      const irAlCarrito = window.confirm(`Añadido: ${cantidad} × ${producto.nombre}\n¿Ir al carrito?`);
      return irAlCarrito ? router.navigate('/carrito') : router.back();
    }

    Alert.alert('Añadido al carrito', `${cantidad} × ${producto.nombre} (talla ${talla.talla})`, [
      { text: 'Seguir comprando', onPress: () => router.back() },
      { text: 'Ver carrito', onPress: () => router.navigate('/carrito') },
    ]);
  }

  return (
    <Fondo>
      <Encabezado titulo={producto.nombre} subtitulo={producto.categoria} onVolver={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <ImagenProducto producto={producto} estilo={estilos.imagen} icono={64} />

        <Tarjeta>
          <Text style={estilos.precio}>{dinero(producto.precio)}</Text>
          <Text style={estilos.descripcion}>{producto.descripcion}</Text>

          <Text style={estilos.subtitulo}>Talla</Text>
          <View style={estilos.fila}>
            {producto.tallas.map((t) => {
              const sinStock = t.stock === 0;
              const elegida = talla?.talla === t.talla;
              return (
                <Pressable
                  key={t.talla}
                  disabled={sinStock}
                  onPress={() => elegirTalla(t)}
                  style={[estilos.opcion, elegida && estilos.opcionActiva, sinStock && estilos.opcionAgotada]}
                >
                  <Text
                    style={[
                      estilos.opcionTexto,
                      elegida && { color: colores.botonTexto },
                      sinStock && estilos.textoAgotado,
                    ]}
                  >
                    {t.talla}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[estilos.stock, (agotado || !talla) && { color: colores.error }]}>
            {agotado
              ? 'Agotado en todas las tallas'
              : talla
                ? `${talla.stock} disponibles en talla ${talla.talla}`
                : 'Elige una talla'}
          </Text>

          {talla ? (
            <>
              <Text style={estilos.subtitulo}>Cantidad</Text>
              <View style={estilos.fila}>
                <Pressable onPress={() => setCantidad(Math.max(1, cantidad - 1))} style={estilos.opcion}>
                  <Text style={estilos.opcionTexto}>−</Text>
                </Pressable>
                <Text style={estilos.cantidad}>{cantidad}</Text>
                <Pressable onPress={() => setCantidad(Math.min(talla.stock, cantidad + 1))} style={estilos.opcion}>
                  <Text style={estilos.opcionTexto}>+</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </Tarjeta>

        {error ? <Text style={estilos.error}>{error}</Text> : null}
        <Boton
          titulo={agotado ? 'Agotado' : `Añadir al carrito · ${dinero(producto.precio * cantidad)}`}
          icono={agotado ? null : 'cart-outline'}
          onPress={anadir}
          cargando={agregando}
          deshabilitado={agotado || !talla}
        />
        <Text style={estilos.nota}>Al añadirlo, el producto queda apartado para ti durante un tiempo.</Text>
      </ScrollView>
    </Fondo>
  );
}

const estilos = StyleSheet.create({
  imagen: { width: '100%', aspectRatio: 1.3, borderRadius: 20 },
  precio: { color: colores.texto, fontSize: 26, fontWeight: '700' },
  descripcion: { color: colores.textoSuave, fontSize: 14, marginTop: 8, lineHeight: 21 },
  subtitulo: {
    color: colores.textoSuave,
    marginTop: 18,
    marginBottom: 8,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
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
  opcionActiva: { backgroundColor: colores.botonFondo, borderColor: 'transparent' },
  opcionAgotada: { opacity: 0.4 },
  opcionTexto: { color: colores.texto, fontWeight: '600', fontSize: 15 },
  textoAgotado: { textDecorationLine: 'line-through' },
  stock: { color: colores.exito, fontSize: 13, fontWeight: '600', marginTop: 10 },
  cantidad: { color: colores.texto, fontSize: 18, fontWeight: '700', minWidth: 36, textAlign: 'center' },
  nota: { color: colores.textoSuave, fontSize: 12, textAlign: 'center' },
  error: { color: colores.error, backgroundColor: colores.errorFondo, padding: 12, borderRadius: 12, fontSize: 13 },
});
