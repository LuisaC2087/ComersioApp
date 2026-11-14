// ADMINISTRAR PRODUCTOS (ruta "/admin/productos", solo rol "admin")
// Lista con stock, crear, editar y eliminar.
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Boton from '../../components/Boton';
import Encabezado from '../../components/Encabezado';
import Fondo from '../../components/Fondo';
import ImagenProducto from '../../components/ImagenProducto';
import Tarjeta from '../../components/Tarjeta';
import { eliminarProducto, obtenerProductos } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { confirmar } from '../../lib/confirmar';
import { dinero } from '../../lib/formato';
import { colores } from '../../lib/tema';

export default function AdminProductos() {
  const { sesion } = useAuth();
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState('');

  const cargar = () => obtenerProductos().then(setProductos).catch((e) => setError(e.message));
  useFocusEffect(useCallback(() => { cargar(); }, []));

  function eliminar(producto) {
    confirmar('¿Eliminar producto?', `Se borrará "${producto.nombre}" de la tienda.`, async () => {
      try {
        await eliminarProducto(sesion.token, producto.id);
        cargar();
      } catch (e) {
        setError(e.message);
      }
    });
  }

  return (
    <Fondo>
      <Encabezado titulo="Productos" subtitulo={`${productos.length} en la tienda`} onVolver={() => router.back()} />

      <FlatList
        data={productos}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={estilos.lista}
        onRefresh={cargar}
        refreshing={false}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 12 }}>
            <Boton titulo="Nuevo producto" icono="add" onPress={() => router.push('/admin/producto')} />
            {error ? <Text style={estilos.error}>{error}</Text> : null}
          </View>
        }
        renderItem={({ item }) => (
          <Tarjeta style={estilos.item}>
            <ImagenProducto producto={item} estilo={{ width: 52, height: 52 }} icono={22} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={estilos.nombre} numberOfLines={1}>{item.nombre}</Text>
              <Text style={estilos.suave}>{item.categoria} · {dinero(item.precio)}</Text>
              <Text style={[estilos.stock, item.stock === 0 && { color: colores.error }]}>
                {item.stock === 0 ? 'Agotado' : `Stock total: ${item.stock}`}
              </Text>
              {/* Stock de cada talla: "S 5 · M 0 · L 3" */}
              <Text style={estilos.suave} numberOfLines={1}>
                {item.tallas.map((t) => `${t.talla} ${t.stock}`).join(' · ')}
              </Text>
            </View>
            <Pressable style={estilos.accion} onPress={() => router.push(`/admin/producto?id=${item.id}`)} hitSlop={6}>
              <Ionicons name="pencil-outline" size={17} color={colores.texto} />
            </Pressable>
            <Pressable style={estilos.accion} onPress={() => eliminar(item)} hitSlop={6}>
              <Ionicons name="trash-outline" size={17} color={colores.error} />
            </Pressable>
          </Tarjeta>
        )}
      />
    </Fondo>
  );
}

const estilos = StyleSheet.create({
  lista: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  nombre: { color: colores.texto, fontWeight: '600', fontSize: 14 },
  suave: { color: colores.textoSuave, fontSize: 12, marginTop: 2 },
  stock: { color: colores.exito, fontSize: 12, fontWeight: '600', marginTop: 2 },
  accion: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colores.vidrioFuerte,
    borderWidth: 1,
    borderColor: colores.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { color: colores.error, backgroundColor: colores.errorFondo, padding: 10, borderRadius: 12, fontSize: 13 },
});
