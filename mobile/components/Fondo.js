// Fondo de todas las pantallas: degradado oscuro + dos luces de color.
// Las luces son lo que se ve "difuminado" detrás de las tarjetas de vidrio.
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
      <View style={[estilos.luz, { backgroundColor: colores.circulo1, top: -120, left: -100 }]} />
      <View style={[estilos.luz, { backgroundColor: colores.circulo2, bottom: 60, right: -140 }]} />
      <SafeAreaView style={estilos.fondo} edges={['top']}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1 },
  luz: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    opacity: 0.22,
  },
});
