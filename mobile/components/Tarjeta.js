// Tarjeta de "vidrio": la pieza principal del estilo glassmorphism.
// Uso:  <Tarjeta> ...contenido... </Tarjeta>
//
// Capas: sombra suave (afuera) + blanco semitransparente + desenfoque (BlurView)
// + borde blanco fino. Los colores salen de lib/tema.js.
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import { colores, radio } from '../lib/tema';

export default function Tarjeta({ children, style }) {
  return (
    <View style={[estilos.sombra, style && { flex: style.flex }]}>
      <View style={[estilos.tarjeta, style]}>
        {/* Capa de desenfoque detrás del contenido */}
        <BlurView intensity={30} tint={colores.tintaBlur} style={StyleSheet.absoluteFill} />
        {children}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  // La sombra va en una vista aparte porque "overflow: hidden" (necesario
  // para redondear el blur) recortaría la sombra.
  sombra: {
    borderRadius: radio,
    shadowColor: colores.sombra,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  tarjeta: {
    backgroundColor: colores.vidrio,
    borderColor: colores.borde,
    borderWidth: 1,
    borderRadius: radio,
    overflow: 'hidden',
    padding: 18,
  },
});
