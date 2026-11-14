// CREAR / EDITAR PRODUCTO (rutas "/admin/producto" y "/admin/producto?id=5")
// - Cada talla tiene su propio stock (filas "Talla | Stock").
// - La imagen se elige de la galería (se guarda en base64 dentro de la base de
//   datos) o se pega una URL https de una foto.
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Boton from '../../components/Boton';
import Campo from '../../components/Campo';
import Encabezado from '../../components/Encabezado';
import Fondo from '../../components/Fondo';
import ImagenProducto from '../../components/ImagenProducto';
import Tarjeta from '../../components/Tarjeta';
import { actualizarProducto, crearProducto, obtenerProducto } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { elegirImagen } from '../../lib/elegirImagen';
import { colores } from '../../lib/tema';

// Tallas con las que empieza un producto nuevo (se pueden cambiar en el formulario)
const TALLAS_INICIALES = [
  { talla: 'S', stock: '0' },
  { talla: 'M', stock: '0' },
  { talla: 'L', stock: '0' },
];

export default function FormularioProducto() {
  const { sesion } = useAuth();
  const { id } = useLocalSearchParams(); // sin id = crear, con id = editar

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState('');
  const [tallas, setTallas] = useState(TALLAS_INICIALES); // [{ talla, stock }] (como texto mientras se edita)
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
        setTallas(p.tallas.map((t) => ({ talla: t.talla, stock: String(t.stock) })));
        setImagen(p.imagen);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  // ---- Editor de tallas ----
  function cambiarTalla(indice, campo, valor) {
    setTallas(tallas.map((t, i) => (i === indice ? { ...t, [campo]: valor } : t)));
  }
  const agregarTalla = () => setTallas([...tallas, { talla: '', stock: '0' }]);
  const quitarTalla = (indice) => setTallas(tallas.filter((_, i) => i !== indice));

  // Abre la galería; la foto llega en base64 (cuadrada)
  async function cambiarFoto() {
    const foto = await elegirImagen([1, 1]);
    if (foto) setImagen(foto);
  }

  async function guardar() {
    setError('');
    setGuardando(true);
    try {
      const datos = {
        nombre,
        descripcion,
        precio,
        categoria,
        imagen,
        tallas: tallas.map((t) => ({ talla: t.talla, stock: Number(t.stock || 0) })),
      };
      if (id) await actualizarProducto(sesion.token, id, datos);
      else await crearProducto(sesion.token, datos);
      router.back();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  const stockTotal = tallas.reduce((suma, t) => suma + Number(t.stock || 0), 0);

  return (
    <Fondo>
      <Encabezado titulo={id ? 'Editar producto' : 'Nuevo producto'} onVolver={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* Imagen del producto */}
        <Tarjeta style={{ alignItems: 'center', gap: 12 }}>
          <ImagenProducto producto={{ imagen }} estilo={{ width: 140, height: 140 }} icono={48} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Boton titulo="Elegir foto" variante="vidrio" icono="image-outline" onPress={cambiarFoto} />
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

        {/* Datos generales */}
        <Tarjeta>
          <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} autoCapitalize="sentences" placeholder="Camisa Oxford" />
          <Campo etiqueta="Descripción" value={descripcion} onChangeText={setDescripcion} autoCapitalize="sentences" multiline placeholder="Camisa de algodón..." />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Campo style={{ flex: 1, marginBottom: 0 }} etiqueta="Precio" value={precio} onChangeText={setPrecio} keyboardType="decimal-pad" placeholder="189.00" />
            <Campo style={{ flex: 1, marginBottom: 0 }} etiqueta="Categoría" value={categoria} onChangeText={setCategoria} autoCapitalize="sentences" placeholder="Camisas" />
          </View>
        </Tarjeta>

        {/* Tallas y stock por talla */}
        <Tarjeta>
          <View style={estilos.cabeceraTallas}>
            <Text style={estilos.titulo}>Tallas y stock</Text>
            <Text style={estilos.total}>Total: {stockTotal}</Text>
          </View>

          {tallas.map((t, i) => (
            <View key={i} style={estilos.filaTalla}>
              <Campo
                style={{ flex: 1, marginBottom: 0 }}
                value={t.talla}
                onChangeText={(v) => cambiarTalla(i, 'talla', v)}
                autoCapitalize="characters"
                placeholder="Talla"
              />
              <Campo
                style={{ flex: 1, marginBottom: 0 }}
                value={t.stock}
                onChangeText={(v) => cambiarTalla(i, 'stock', v.replace(/\D/g, ''))}
                keyboardType="number-pad"
                placeholder="Stock"
              />
              <Pressable onPress={() => quitarTalla(i)} style={estilos.quitar} hitSlop={6}>
                <Ionicons name="trash-outline" size={16} color={colores.error} />
              </Pressable>
            </View>
          ))}

          <Boton titulo="Agregar talla" variante="vidrio" icono="add" onPress={agregarTalla} style={{ marginTop: 4 }} />
        </Tarjeta>

        {error ? <Text style={estilos.error}>{error}</Text> : null}
        <Boton titulo={id ? 'Guardar cambios' : 'Crear producto'} icono="checkmark" onPress={guardar} cargando={guardando} />
      </ScrollView>
    </Fondo>
  );
}

const estilos = StyleSheet.create({
  cabeceraTallas: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  titulo: { color: colores.textoSuave, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  total: { color: colores.acento, fontSize: 13, fontWeight: '700' },
  filaTalla: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 },
  quitar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colores.errorFondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { color: colores.error, backgroundColor: colores.errorFondo, padding: 12, borderRadius: 12, fontSize: 13 },
});
