// CREAR / EDITAR PRODUCTO (rutas "/admin/producto" y "/admin/producto?id=5")
// La imagen se elige de la galería (se guarda en base64 dentro de la base de
// datos) o se pega una URL https de una foto.
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Boton from '../../components/Boton';
import Campo from '../../components/Campo';
import Encabezado from '../../components/Encabezado';
import Fondo from '../../components/Fondo';
import ImagenProducto from '../../components/ImagenProducto';
import Tarjeta from '../../components/Tarjeta';
import { actualizarProducto, crearProducto, obtenerProducto } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { colores } from '../../lib/tema';

export default function FormularioProducto() {
  const { sesion } = useAuth();
  const { id } = useLocalSearchParams(); // sin id = crear, con id = editar

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState('');
  const [tallas, setTallas] = useState('');
  const [stock, setStock] = useState('20');
  const [imagen, setImagen] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Si venimos a editar, llenamos el formulario con el producto actual
  useEffect(() => {
    if (!id) return;
    obtenerProducto(id)
      .then((p) => {
        setNombre(p.nombre);
        setDescripcion(p.descripcion || '');
        setPrecio(String(p.precio));
        setCategoria(p.categoria);
        setTallas(p.tallas.join(', '));
        setStock(String(p.stock));
        setImagen(p.imagen);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  // Abre la galería y guarda la foto como base64 (reducida para que pese poco)
  async function elegirImagen() {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });
    if (resultado.canceled) return;

    const foto = resultado.assets[0];
    setImagen(foto.base64 ? `data:image/jpeg;base64,${foto.base64}` : foto.uri);
  }

  async function guardar() {
    setError('');
    setGuardando(true);
    try {
      const datos = { nombre, descripcion, precio, categoria, tallas, stock, imagen };
      if (id) await actualizarProducto(sesion.token, id, datos);
      else await crearProducto(sesion.token, datos);
      router.back();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Fondo>
      <Encabezado titulo={id ? 'Editar producto' : 'Nuevo producto'} onVolver={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
        {/* Imagen del producto */}
        <Tarjeta style={{ alignItems: 'center', gap: 12 }}>
          <ImagenProducto producto={{ imagen }} estilo={{ width: 140, height: 140 }} icono={48} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Boton titulo="Elegir foto" variante="vidrio" icono="image-outline" onPress={elegirImagen} />
            {imagen ? (
              <Boton titulo="Quitar" variante="peligro" icono="close" onPress={() => setImagen(null)} />
            ) : null}
          </View>
          <Campo
            etiqueta="O pega la URL de una foto"
            value={imagen && imagen.startsWith('http') ? imagen : ''}
            onChangeText={setImagen}
            placeholder="https://..."
            style={{ alignSelf: 'stretch', marginBottom: 0 }}
          />
        </Tarjeta>

        <Tarjeta>
          <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} autoCapitalize="sentences" placeholder="Camisa Oxford" />
          <Campo etiqueta="Descripción" value={descripcion} onChangeText={setDescripcion} autoCapitalize="sentences" multiline placeholder="Camisa de algodón..." />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Campo style={{ flex: 1 }} etiqueta="Precio" value={precio} onChangeText={setPrecio} keyboardType="decimal-pad" placeholder="189.00" />
            <Campo style={{ flex: 1 }} etiqueta="Stock" value={stock} onChangeText={(t) => setStock(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="20" />
          </View>
          <Campo etiqueta="Categoría" value={categoria} onChangeText={setCategoria} autoCapitalize="sentences" placeholder="Camisas" />
          <Campo etiqueta="Tallas (separadas por coma)" value={tallas} onChangeText={setTallas} placeholder="S, M, L, XL" style={{ marginBottom: 0 }} />
        </Tarjeta>

        {error ? <Text style={estilos.error}>{error}</Text> : null}
        <Boton titulo={id ? 'Guardar cambios' : 'Crear producto'} icono="checkmark" onPress={guardar} cargando={guardando} />
      </ScrollView>
    </Fondo>
  );
}

const estilos = StyleSheet.create({
  error: { color: colores.error, backgroundColor: 'rgba(248,113,113,0.1)', padding: 12, borderRadius: 12, fontSize: 13 },
});
