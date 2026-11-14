import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import Boton from '../components/Boton';
import Campo from '../components/Campo';
import Fondo from '../components/Fondo';
import Tarjeta from '../components/Tarjeta';
import { login } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { TIENDA } from '../lib/config';
import { colores } from '../lib/tema';

export default function Login() {
  const { iniciarSesion } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function entrar() {
    setError('');
    setCargando(true);
    try {
      const { token, usuario } = await login(email, password);
      iniciarSesion(token, usuario); // la app cambia sola al catálogo
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <Fondo>
      <KeyboardAvoidingView
        style={estilos.centro}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={estilos.logo}>
          <Ionicons name="bag-handle-outline" size={34} color={colores.texto} />
        </View>
        <Text style={estilos.titulo}>{TIENDA.nombre}</Text>
        <Text style={estilos.subtitulo}>Tu tienda de ropa en línea</Text>

        <Tarjeta style={estilos.tarjeta}>
          <Campo etiqueta="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="tu@email.com" />
          <Campo etiqueta="Contraseña" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••" />

          {error ? <Text style={estilos.error}>{error}</Text> : null}
          {cargando ? (
            <Text style={estilos.nota}>Si el servidor estaba dormido puede tardar hasta 1 minuto…</Text>
          ) : null}

          <Boton titulo="Iniciar sesión" onPress={entrar} cargando={cargando} />

          <Link href="/registro" style={estilos.enlace}>
            ¿No tienes cuenta? Regístrate
          </Link>
        </Tarjeta>

        <Text style={estilos.nota}>
          Cliente: demo@tienda.com / 123456{'\n'}Administrador: admin@tienda.com / admin123
        </Text>
      </KeyboardAvoidingView>
    </Fondo>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colores.vidrioFuerte,
    borderWidth: 1,
    borderColor: colores.borde,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  titulo: { color: colores.texto, fontSize: 30, fontWeight: '700', textAlign: 'center', letterSpacing: 0.3 },
  subtitulo: { color: colores.textoSuave, textAlign: 'center', marginBottom: 26, marginTop: 4 },
  tarjeta: { padding: 22 },
  error: { color: colores.error, backgroundColor: colores.errorFondo, padding: 10, borderRadius: 12, marginBottom: 12, fontSize: 13 },
  nota: { color: colores.textoSuave, textAlign: 'center', fontSize: 12, marginVertical: 12, lineHeight: 18 },
  enlace: { color: colores.acento, textAlign: 'center', marginTop: 16, fontSize: 14 },
});
