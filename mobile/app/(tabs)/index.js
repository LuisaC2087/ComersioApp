// Pestaña CATÁLOGO (ruta "/")
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Encabezado from '../../components/Encabezado';
import Fondo from '../../components/Fondo';
import ImagenProducto from '../../components/ImagenProducto';
import Tarjeta from '../../components/Tarjeta';
import { obtenerProductos } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { guardarCache, leerCache } from '../../lib/db';
import { dinero } from '../../lib/formato';
import { colores } from '../../lib/tema';

export default function Catalogo() {
  const { sesion } = useAuth();
  const [productos, setProductos] = useState([]);
  const [categoria, setCategoria] = useState('Todos');
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState('');

  async function cargar() {
    setCargando(true);
    setAviso('');
    try {
      const lista = await obtenerProductos();
      setProductos(lista);
      guardarCache('productos', lista); // copia en SQLite para usar sin internet
    } catch (e) {
      const guardados = leerCache('productos');
      if (guardados) {
        setProductos(guardados);
        setAviso('Sin conexión: mostrando el catálogo guardado en el teléfono');
      } else {
        setAviso(e.message);
      }
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  // Categorías sacadas de los mismos productos
  const categorias = ['Todos', ...new Set(productos.map((p) => p.categoria))];
  const visibles = categoria === 'Todos' ? productos : productos.filter((p) => p.categoria === categoria);
  const primerNombre = sesion.usuario.nombre.split(' ')[0];

  return (
    <Fondo>
      <Encabezado titulo="Catálogo" subtitulo={`Hola, ${primerNombre} 👋`} />

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
          {categorias.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategoria(c)}
              style={[estilos.chip, c === categoria && estilos.chipActivo]}
            >
              <Text style={[estilos.chipTexto, c === categoria && { color: '#3a1c71' }]}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {aviso ? <Text style={estilos.aviso}>{aviso}</Text> : null}

      {cargando && productos.length === 0 ? (
        <ActivityIndicator color="#fff" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={visibles}
          keyExtractor={(p) => String(p.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={estilos.lista}
          refreshing={cargando}
          onRefresh={cargar}
          renderItem={({ item }) => (
            <Pressable style={{ flex: 1 }} onPress={() => router.push(`/producto/${item.id}`)}>
              <Tarjeta style={estilos.tarjeta}>
                <ImagenProducto producto={item} tamano={52} />
                <Text style={estilos.nombre} numberOfLines={1}>{item.nombre}</Text>
                <Text style={estilos.categoria}>{item.categoria}</Text>
                <Text style={estilos.precio}>{dinero(item.precio)}</Text>
              </Tarjeta>
            </Pressable>
          )}
        />
      )}
    </Fondo>
  );
}

const estilos = StyleSheet.create({
  chips: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colores.vidrio,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  chipActivo: { backgroundColor: colores.acento },
  chipTexto: { color: colores.texto, fontWeight: '600' },
  aviso: { color: colores.texto, backgroundColor: 'rgba(0,0,0,0.25)', marginHorizontal: 20, padding: 10, borderRadius: 12, marginBottom: 8 },
  lista: { paddingHorizontal: 20, paddingBottom: 120, gap: 12 },
  tarjeta: { alignItems: 'center', paddingVertical: 20 },
  nombre: { color: colores.texto, fontWeight: '700', fontSize: 15, marginTop: 10 },
  categoria: { color: colores.textoSuave, fontSize: 12 },
  precio: { color: colores.acento, fontWeight: '800', fontSize: 17, marginTop: 6 },
});
