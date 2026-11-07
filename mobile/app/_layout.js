// ============================================================
//  LAYOUT RAÍZ (Expo Router)
//  Cada archivo dentro de app/ es una pantalla:
//
//    app/login.js            -> /login
//    app/registro.js         -> /registro
//    app/(tabs)/...          -> pestañas: catálogo, carrito, compras, perfil
//    app/producto/[id].js    -> /producto/5
//    app/pago.js             -> /pago
//    app/factura/[id].js     -> /factura/12
//
//  Stack.Protected decide qué pantallas existen según haya sesión o no.
//  Si no hay sesión, Expo Router manda al usuario a /login automáticamente.
// ============================================================
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/AuthContext';
import { colores } from '../lib/tema';

// Fondo oscuro de la navegación (se ve un instante durante las transiciones)
const tema = { ...DarkTheme, colors: { ...DarkTheme.colors, background: colores.degradado[0] } };

function Navegacion() {
  const { sesion } = useAuth();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Solo con sesión iniciada */}
      <Stack.Protected guard={!!sesion}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="producto/[id]" />
        <Stack.Screen name="pago" />
        <Stack.Screen name="factura/[id]" />
      </Stack.Protected>

      {/* Solo sin sesión */}
      <Stack.Protected guard={!sesion}>
        <Stack.Screen name="login" />
        <Stack.Screen name="registro" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={tema}>
        <StatusBar style="light" />
        <Navegacion />
      </ThemeProvider>
    </AuthProvider>
  );
}
