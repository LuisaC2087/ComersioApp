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
//    app/admin/...           -> panel del administrador (solo rol "admin")
//
//  Stack.Protected decide qué pantallas existen según la sesión.
// ============================================================
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/AuthContext';
import { colores } from '../lib/tema';

// Si una pantalla falla, Expo Router muestra el error en lugar de una pantalla en blanco
export { ErrorBoundary } from 'expo-router';

// Color de fondo de la navegación (se ve un instante durante las transiciones)
const tema = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colores.degradado[0] } };

function Navegacion() {
  const { sesion } = useAuth();
  const esAdmin = sesion?.usuario?.rol === 'admin';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Solo con sesión iniciada */}
      <Stack.Protected guard={!!sesion}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="producto/[id]" />
        <Stack.Screen name="pago" />
        <Stack.Screen name="factura/[id]" />
      </Stack.Protected>

      {/* Solo administradores */}
      <Stack.Protected guard={esAdmin}>
        <Stack.Screen name="admin/index" />
        <Stack.Screen name="admin/productos" />
        <Stack.Screen name="admin/producto" />
        <Stack.Screen name="admin/banners" />
        <Stack.Screen name="admin/banner" />
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
        <StatusBar style={colores.barraEstado} />
        <Navegacion />
      </ThemeProvider>
    </AuthProvider>
  );
}
