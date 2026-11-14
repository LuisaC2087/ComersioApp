// CREAR / EDITAR BANNER DEL CARRUSEL (rutas "/admin/banner" y "/admin/banner?id=3")
// Imagen panorámica (galería o URL), título, subtítulo, producto al que
// lleva al tocarlo (opcional), orden y si está visible.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Boton from '../../components/Boton';
import Campo from '../../components/Campo';
import Encabezado from '../../components/Encabezado';
import Fondo from '../../components/Fondo';
import Tarjeta from '../../components/Tarjeta';
import { actualizarBanner, crearBanner, obtenerBanner, obtenerProductos } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { elegirImagen } from '../../lib/elegirImagen';
import { colores } from '../../lib/tema';

export default function FormularioBanner() {
  const { sesion } = useAuth();
  const { id } = useLocalSearchParams(); // sin id = crear, con id = editar

  const [titulo, setTitulo] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [imagen, setImagen] = useState(null);
  const [productoId, setProductoId] = useState(null);
  const [orden, setOrden] = useState('0');
  const [activo, setActivo] = useState(true);
  const [productos, setProductos] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Lista de productos para elegir a cuál lleva el banner
    obtenerProductos().then(setProductos).catch(() => {});
    if (!id) return;
    obtenerBanner(id)
      .then((b) => {
        setTitulo(b.titulo);
        setSubtitulo(b.subtitulo || '');
        setImagen(b.imagen);
        setProductoId(b.producto_id);
        setOrden(String(b.orden));
        setActivo(b.activo);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  async function cambiarFoto() {
    const foto = await elegirImagen([16, 9]); // panorámica, como el carrusel
    if (foto) setImagen(foto);
  }

  async function guardar() {
    setError('');
    setGuardando(true);
    try {
      const datos = { titulo, subtitulo, imagen, productoId, orden: Number(orden || 0), activo };
      if (id) await actualizarBanner(sesion.token, id, datos);
      else await crearBanner(sesion.token, datos);
      router.back();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Fondo>
      <Encabezado titulo={id ? 'Editar banner' : 'Nuevo banner'} onVolver={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* Imagen */}
        <Tarjeta style={{ gap: 12 }}>
          {imagen ? (
            <Image source={{ uri: imagen }} style={estilos.vista} resizeMode="cover" />
          ) : (
            <View style={[estilos.vista, estilos.vacio]}>
              <Text style={estilos.nota}>Sin imagen (recomendado: horizontal 16:9)</Text>
            </View>
          )}
          <Boton titulo="Elegir foto" variante="vidrio" icono="image-outline" onPress={cambiarFoto} />
          <Campo
            etiqueta="O pega la URL de una foto"
            value={imagen && imagen.startsWith('http') ? imagen : ''}
            onChangeText={setImagen}
            placeholder="https://..."
            style={{ marginBottom: 0 }}
          />
        </Tarjeta>

        {/* Textos */}
        <Tarjeta>
          <Campo etiqueta="Título" value={titulo} onChangeText={setTitulo} autoCapitalize="sentences" placeholder="Nueva colección de invierno" />
          <Campo etiqueta="Subtítulo (opcional)" value={subtitulo} onChangeText={setSubtitulo} autoCapitalize="sentences" placeholder="Hasta 30% de descuento" />
          <View style={estilos.filaSwitch}>
            <Campo
              style={{ flex: 1, marginBottom: 0 }}
              etiqueta="Orden (0 = primero)"
              value={orden}
              onChangeText={(t) => setOrden(t.replace(/\D/g, ''))}
              keyboardType="number-pad"
            />
            <View style={{ alignItems: 'center' }}>
              <Text style={estilos.etiqueta}>Visible</Text>
              <Switch value={activo} onValueChange={setActivo} trackColor={{ true: colores.acento }} />
            </View>
          </View>
        </Tarjeta>

        {/* Producto al que lleva el banner */}
        <Tarjeta>
          <Text style={estilos.etiqueta}>Al tocarlo abre (opcional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
            {[{ id: null, nombre: 'Nada' }, ...productos].map((p) => (
              <Pressable
                key={String(p.id)}
                onPress={() => setProductoId(p.id)}
                style={[estilos.chip, productoId === p.id && estilos.chipActivo]}
              >
                <Text style={[estilos.chipTexto, productoId === p.id && { color: colores.botonTexto }]}>{p.nombre}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Tarjeta>

        {error ? <Text style={estilos.error}>{error}</Text> : null}
        <Boton titulo={id ? 'Guardar cambios' : 'Crear banner'} icono="checkmark" onPress={guardar} cargando={guardando} />
      </ScrollView>
    </Fondo>
  );
}

const estilos = StyleSheet.create({
  vista: { width: '100%', aspectRatio: 16 / 9, borderRadius: 14 },
  vacio: {
    backgroundColor: colores.vidrio,
    borderWidth: 1,
    borderColor: colores.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nota: { color: colores.textoSuave, fontSize: 12 },
  etiqueta: { color: colores.textoSuave, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  filaSwitch: { flexDirection: 'row', gap: 16, alignItems: 'flex-end' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colores.vidrio,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  chipActivo: { backgroundColor: colores.botonFondo, borderColor: 'transparent' },
  chipTexto: { color: colores.textoSuave, fontWeight: '600', fontSize: 13 },
  error: { color: colores.error, backgroundColor: colores.errorFondo, padding: 12, borderRadius: 12, fontSize: 13 },
});
