import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import Boton from '../components/Boton';
import Campo from '../components/Campo';
import Encabezado from '../components/Encabezado';
import Fondo from '../components/Fondo';
import Tarjeta from '../components/Tarjeta';
import { registrar } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { colores } from '../lib/tema';

export default function Registro() {
  const { iniciarSesion } = useAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function crearCuenta() {
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setError('');
    setCargando(true);
    try {
      const { token, usuario } = await registrar(nombre, email, password);
      iniciarSesion(token, usuario);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <Fondo>
      <Encabezado titulo="Crear cuenta" onVolver={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Tarjeta style={{ padding: 22 }}>
          <Campo etiqueta="Nombre completo" value={nombre} onChangeText={setNombre} autoCapitalize="words" placeholder="Ana López" />
          <Campo etiqueta="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="tu@email.com" />
          <Campo etiqueta="Contraseña" value={password} onChangeText={setPassword} secureTextEntry placeholder="Mínimo 6 caracteres" />
          <Campo etiqueta="Confirmar contraseña" value={confirmar} onChangeText={setConfirmar} secureTextEntry placeholder="Repite la contraseña" />

          {error ? <Text style={estilos.error}>{error}</Text> : null}
          <Boton titulo="Registrarme" onPress={crearCuenta} cargando={cargando} />
        </Tarjeta>
      </ScrollView>
    </Fondo>
  );
}

const estilos = StyleSheet.create({
  error: { color: colores.error, backgroundColor: colores.errorFondo, padding: 10, borderRadius: 12, marginBottom: 12, fontSize: 13 },
});
