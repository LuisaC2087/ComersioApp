// Tarjeta de "vidrio": la pieza principal del estilo glassmorphism.
// Uso:  <Tarjeta> ...contenido... </Tarjeta>
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import { colores, radio } from '../lib/tema';

export default function Tarjeta({ children, style }) {
  return (
    <View style={[estilos.tarjeta, style]}>
      {/* Capa de desenfoque detrás del contenido */}
      <BlurView intensity={35} tint="light" style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.vidrio,
    borderColor: colores.borde,
    borderWidth: 1,
    borderRadius: radio,
    overflow: 'hidden',
    padding: 16,
  },
});
