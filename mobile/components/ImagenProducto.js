// Muestra la foto real del producto (campo "imagen": URL o foto en base64).
// Si el producto no tiene foto, muestra un ícono sobre un fondo suave.
// Uso:  <ImagenProducto producto={p} estilo={{ width: 64, height: 64 }} />
import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, View } from 'react-native';
import { colores } from '../lib/tema';

export default function ImagenProducto({ producto, estilo, icono = 36 }) {
  if (producto.imagen) {
    return <Image source={{ uri: producto.imagen }} style={[estilos.base, estilo]} resizeMode="cover" />;
  }
  return (
    <View style={[estilos.base, estilos.vacio, estilo]}>
      <Ionicons name="shirt-outline" size={icono} color={colores.textoSuave} />
    </View>
  );
}

const estilos = StyleSheet.create({
  base: { borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)' },
  vacio: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colores.borde,
  },
});
