// Fondo de todas las pantallas: degradado + dos círculos de color.
// Los círculos son los que se ven "borrosos" detrás de las tarjetas de vidrio.
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colores } from '../lib/tema';

export default function Fondo({ children }) {
  return (
    <LinearGradient
      colors={colores.degradado}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={estilos.fondo}
    >
      <View style={[estilos.circulo, { backgroundColor: colores.circulo1, top: -70, left: -70 }]} />
      <View style={[estilos.circulo, { backgroundColor: colores.circulo2, bottom: 120, right: -90 }]} />
      <SafeAreaView style={estilos.fondo} edges={['top']}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1 },
  circulo: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.5,
  },
});
