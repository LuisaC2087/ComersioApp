// Barra de pestañas inferior (de vidrio), con íconos de línea.
// Cada archivo de esta carpeta es una pestaña.
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { colores } from '../../lib/tema';

// Ícono de pestaña: contorno normal, relleno cuando está activa
const icono = (nombre) => ({ focused, color }) => (
  <Ionicons name={focused ? nombre : `${nombre}-outline`} size={22} color={color} />
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.texto,
        tabBarInactiveTintColor: colores.textoSuave,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: estilos.barra,
        tabBarBackground: () => <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Catálogo', tabBarIcon: icono('storefront') }} />
      <Tabs.Screen name="carrito" options={{ title: 'Carrito', tabBarIcon: icono('cart') }} />
      <Tabs.Screen name="historial" options={{ title: 'Compras', tabBarIcon: icono('receipt') }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: icono('person') }} />
    </Tabs>
  );
}

const estilos = StyleSheet.create({
  barra: {
    position: 'absolute',
    backgroundColor: 'rgba(13,15,29,0.55)',
    borderTopColor: colores.borde,
    borderTopWidth: 1,
    elevation: 0,
  },
});
