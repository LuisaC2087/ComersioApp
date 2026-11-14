// CARRUSEL DE INICIO (ruta "/admin/banners", solo rol "admin")
// Lista de banners (modelos, promociones): crear, editar, ocultar y eliminar.
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Boton from '../../components/Boton';
import Encabezado from '../../components/Encabezado';
import Fondo from '../../components/Fondo';
import Tarjeta from '../../components/Tarjeta';
import { eliminarBanner, obtenerBanners } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { confirmar } from '../../lib/confirmar';
import { colores } from '../../lib/tema';

export default function AdminBanners() {
  const { sesion } = useAuth();
  const [banners, setBanners] = useState([]);
  const [error, setError] = useState('');

  // todos = true: también trae los ocultos
  const cargar = () => obtenerBanners(true).then(setBanners).catch((e) => setError(e.message));
  useFocusEffect(useCallback(() => { cargar(); }, []));

  function eliminar(banner) {
    confirmar('¿Eliminar banner?', `Se quitará "${banner.titulo}" del carrusel.`, async () => {
      try {
        await eliminarBanner(sesion.token, banner.id);
        cargar();
      } catch (e) {
        setError(e.message);
      }
    });
  }

  return (
    <Fondo>
      <Encabezado titulo="Carrusel de inicio" subtitulo={`${banners.length} banner(s)`} onVolver={() => router.back()} />

      <FlatList
        data={banners}
        keyExtractor={(b) => String(b.id)}
        contentContainerStyle={estilos.lista}
        onRefresh={cargar}
        refreshing={false}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 12 }}>
            <Boton titulo="Nuevo banner" icono="add" onPress={() => router.push('/admin/banner')} />
            <Text style={estilos.nota}>
              Sube fotos de modelos o promociones. Se muestran arriba del catálogo, en el orden indicado.
            </Text>
            {error ? <Text style={estilos.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={<Text style={estilos.nota}>Aún no hay banners</Text>}
        renderItem={({ item }) => (
          <Tarjeta style={estilos.item}>
            <Image source={{ uri: item.imagen }} style={estilos.miniatura} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={estilos.titulo} numberOfLines={1}>{item.titulo}</Text>
              <Text style={estilos.nota} numberOfLines={1}>{item.subtitulo || 'Sin subtítulo'}</Text>
              <Text style={[estilos.estado, !item.activo && { color: colores.textoSuave }]}>
                {item.activo ? 'Visible' : 'Oculto'} · orden {item.orden}
              </Text>
            </View>
            <Pressable style={estilos.accion} onPress={() => router.push(`/admin/banner?id=${item.id}`)} hitSlop={6}>
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
  item: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  miniatura: { width: 86, height: 50, borderRadius: 10, backgroundColor: colores.vidrio },
  titulo: { color: colores.texto, fontWeight: '600', fontSize: 14 },
  nota: { color: colores.textoSuave, fontSize: 12, lineHeight: 18 },
  estado: { color: colores.exito, fontSize: 12, fontWeight: '600', marginTop: 2 },
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
