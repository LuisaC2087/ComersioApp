// Muestra la foto del producto si tiene "imagen"; si no, su emoji.
import { Image, Text } from 'react-native';

export default function ImagenProducto({ producto, tamano = 60 }) {
  if (producto.imagen) {
    return (
      <Image
        source={{ uri: producto.imagen }}
        style={{ width: tamano * 1.6, height: tamano * 1.6, borderRadius: 16 }}
      />
    );
  }
  return <Text style={{ fontSize: tamano }}>{producto.emoji || '👚'}</Text>;
}
