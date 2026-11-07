// Barra de pestañas inferior (de vidrio).
// Cada archivo de esta carpeta es una pestaña.
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { colores } from '../../lib/tema';

// Ícono de pestaña hecho con un emoji (no necesita librerías)
const icono = (emoji) => ({ focused }) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.acento,
        tabBarInactiveTintColor: colores.textoSuave,
        tabBarStyle: estilos.barra,
        tabBarBackground: () => <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Catálogo', tabBarIcon: icono('🛍️') }} />
      <Tabs.Screen name="carrito" options={{ title: 'Carrito', tabBarIcon: icono('🛒') }} />
      <Tabs.Screen name="historial" options={{ title: 'Compras', tabBarIcon: icono('🧾') }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: icono('👤') }} />
    </Tabs>
  );
}

const estilos = StyleSheet.create({
  barra: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderTopColor: colores.borde,
    borderTopWidth: 1,
    elevation: 0,
  },
});
