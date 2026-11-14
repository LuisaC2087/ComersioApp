// ============================================================
//  FONDO de todas las pantallas
//
//  Capa 1: un degradado lineal claro (expo-linear-gradient).
//  Capa 2: tres "luces" hechas con gradientes RADIALES en SVG: el color es
//          intenso en el centro y se desvanece hasta volverse transparente,
//          por eso se ven difuminadas y no como círculos sólidos.
//  Capa 3: el contenido de la pantalla (respetando la muesca del celular).
//
//  Para cambiar colores: lib/tema.js (degradado, luz1, luz2, luz3).
//  Para mover una luz: cambia cx/cy (posición) y r (tamaño) en LUCES.
// ============================================================
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colores } from '../lib/tema';

const LUCES = [
  { id: 'luz1', color: colores.luz1, cx: '10%', cy: '5%', r: '65%' },
  { id: 'luz2', color: colores.luz2, cx: '100%', cy: '45%', r: '60%' },
  { id: 'luz3', color: colores.luz3, cx: '15%', cy: '100%', r: '65%' },
];

export default function Fondo({ children }) {
  return (
    <LinearGradient colors={colores.degradado} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={estilos.fondo}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          {LUCES.map((luz) => (
            <RadialGradient key={luz.id} id={luz.id} cx={luz.cx} cy={luz.cy} r={luz.r}>
              <Stop offset="0" stopColor={luz.color} stopOpacity="0.75" />
              <Stop offset="1" stopColor={luz.color} stopOpacity="0" />
            </RadialGradient>
          ))}
        </Defs>
        {LUCES.map((luz) => (
          <Rect key={luz.id} x="0" y="0" width="100%" height="100%" fill={`url(#${luz.id})`} />
        ))}
      </Svg>

      <SafeAreaView style={estilos.fondo} edges={['top']}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1 },
});
