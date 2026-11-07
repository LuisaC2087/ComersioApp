import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from 'react-native';
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
      iniciarSesion(token, usuario); // Expo Router cambia solo al catálogo
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
        <Text style={estilos.logo}>🛍️</Text>
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

        <Text style={estilos.nota}>Prueba con: demo@tienda.com / 123456</Text>
      </KeyboardAvoidingView>
    </Fondo>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 64, textAlign: 'center' },
  titulo: { color: colores.texto, fontSize: 34, fontWeight: '800', textAlign: 'center' },
  subtitulo: { color: colores.textoSuave, textAlign: 'center', marginBottom: 24 },
  tarjeta: { padding: 22 },
  error: { color: colores.error, backgroundColor: 'rgba(0,0,0,0.25)', padding: 8, borderRadius: 10, marginBottom: 12 },
  nota: { color: colores.textoSuave, textAlign: 'center', fontSize: 12, marginVertical: 10 },
  enlace: { color: colores.texto, textAlign: 'center', textDecorationLine: 'underline', marginTop: 16 },
});
