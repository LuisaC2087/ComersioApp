// Pestaña CATÁLOGO (ruta "/"): carrusel de promociones + filtros + productos
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Carrusel from '../../components/Carrusel';
import Encabezado from '../../components/Encabezado';
import Fondo from '../../components/Fondo';
import ImagenProducto from '../../components/ImagenProducto';
import Tarjeta from '../../components/Tarjeta';
import { obtenerBanners, obtenerCategorias, obtenerProductos } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { guardarCache, leerCache } from '../../lib/db';
import { dinero } from '../../lib/formato';
import { colores } from '../../lib/tema';

export default function Catalogo() {
  const { sesion } = useAuth();
  const [productos, setProductos] = useState([]);
  const [banners, setBanners] = useState(() => leerCache('banners') || []);
  const [categorias, setCategorias] = useState(['Todos']);
  const [categoria, setCategoria] = useState('Todos');
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState('');

  // Consulta la base de datos (PostgreSQL) a través del microservicio de productos
  async function cargar() {
    setCargando(true);
    setAviso('');
    try {
      const filtro = categoria === 'Todos' ? null : categoria;
      const [lista, nombres, promos] = await Promise.all([
        obtenerProductos(filtro),
        obtenerCategorias(),
        obtenerBanners(),
      ]);
      setProductos(lista);
      setCategorias(['Todos', ...nombres]);
      setBanners(promos);
      guardarCache('banners', promos);
      if (!filtro) guardarCache('productos', lista); // copia local solo para usar sin internet
    } catch (e) {
      // Sin conexión: usamos la última copia guardada en el teléfono
      const guardados = leerCache('productos');
      if (guardados) {
        setProductos(categoria === 'Todos' ? guardados : guardados.filter((p) => p.categoria === categoria));
        setCategorias(['Todos', ...new Set(guardados.map((p) => p.categoria))]);
        setAviso('Sin conexión: mostrando el catálogo guardado en el teléfono');
      } else {
        setAviso(e.message);
      }
    } finally {
      setCargando(false);
    }
  }

  // Se consulta al abrir la pestaña (el stock cambia cuando otros reservan)
  // y cada vez que cambia la categoría
  useFocusEffect(useCallback(() => { cargar(); }, [categoria]));

  const primerNombre = sesion.usuario.nombre.split(' ')[0];

  // Lo que va arriba de la lista de productos (se desplaza junto con ella)
  const cabecera = (
    <View style={{ gap: 14, marginBottom: 2 }}>
      <Carrusel banners={banners} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
        {categorias.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategoria(c)}
            style={[estilos.chip, c === categoria && estilos.chipActivo]}
          >
            <Text style={[estilos.chipTexto, c === categoria && { color: colores.botonTexto }]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {aviso ? <Text style={estilos.aviso}>{aviso}</Text> : null}
    </View>
  );

  return (
    <Fondo>
      <Encabezado titulo="Catálogo" subtitulo={`Hola, ${primerNombre}`} />

      <FlatList
          data={productos}
          keyExtractor={(p) => String(p.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={estilos.lista}
          refreshing={cargando && productos.length > 0}
          onRefresh={cargar}
          ListHeaderComponent={cabecera}
          ListEmptyComponent={
            cargando ? <ActivityIndicator color={colores.texto} size="large" style={{ marginTop: 30 }} /> : null
          }
          renderItem={({ item }) => (
            <Pressable style={{ flex: 1 }} onPress={() => router.push(`/producto/${item.id}`)}>
              <Tarjeta style={estilos.tarjeta}>
                <View>
                  <ImagenProducto producto={item} estilo={estilos.imagen} icono={34} />
                  {item.stock === 0 ? (
                    <View style={estilos.agotado}>
                      <Text style={estilos.agotadoTexto}>Agotado</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={estilos.nombre} numberOfLines={1}>{item.nombre}</Text>
                <Text style={estilos.categoria}>{item.categoria}</Text>
                <Text style={estilos.precio}>{dinero(item.precio)}</Text>
              </Tarjeta>
            </Pressable>
          )}
      />
    </Fondo>
  );
}

const estilos = StyleSheet.create({
  chips: { gap: 8 },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colores.vidrio,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  chipActivo: { backgroundColor: colores.botonFondo, borderColor: 'transparent' },
  chipTexto: { color: colores.textoSuave, fontWeight: '600', fontSize: 13 },
  aviso: { color: colores.texto, backgroundColor: colores.avisoFondo, padding: 10, borderRadius: 12, fontSize: 13 },
  lista: { paddingHorizontal: 20, paddingBottom: 120, gap: 12 },
  tarjeta: { padding: 12 },
  imagen: { width: '100%', aspectRatio: 1.05, borderRadius: 13 },
  agotado: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colores.avisoFondo,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  agotadoTexto: { color: colores.error, fontSize: 11, fontWeight: '700' },
  nombre: { color: colores.texto, fontWeight: '600', fontSize: 14, marginTop: 10 },
  categoria: { color: colores.textoSuave, fontSize: 12, marginTop: 1 },
  precio: { color: colores.acento, fontWeight: '700', fontSize: 15, marginTop: 6 },
});
