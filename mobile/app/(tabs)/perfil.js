// Pestaña PERFIL (ruta "/perfil")
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Boton from '../../components/Boton';
import Encabezado from '../../components/Encabezado';
import Fondo from '../../components/Fondo';
import Tarjeta from '../../components/Tarjeta';
import { useAuth } from '../../lib/AuthContext';
import { colores } from '../../lib/tema';

export default function Perfil() {
  const { sesion, cerrarSesion } = useAuth();
  const { nombre, email, rol } = sesion.usuario;

  return (
    <Fondo>
      <Encabezado titulo="Perfil" />
      <View style={{ padding: 20, gap: 14 }}>
        <Tarjeta style={{ alignItems: 'center', paddingVertical: 30 }}>
          <View style={estilos.avatar}>
            <Text style={estilos.inicial}>{nombre.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={estilos.nombre}>{nombre}</Text>
          <Text style={estilos.email}>{email}</Text>
          {rol === 'admin' ? <Text style={estilos.rol}>Administrador</Text> : null}
        </Tarjeta>

        {rol === 'admin' ? (
          <Boton
            titulo="Panel de administración"
            icono="settings-outline"
            onPress={() => router.push('/admin')}
          />
        ) : null}

        <Tarjeta>
          <Text style={estilos.email}>
            Tu sesión, tu carrito y una copia del catálogo y de tus compras se guardan en el
            teléfono (SQLite), para que puedas verlos aunque no tengas internet.
          </Text>
        </Tarjeta>

        <Boton titulo="Cerrar sesión" variante="vidrio" icono="log-out-outline" onPress={cerrarSesion} />
      </View>
    </Fondo>
  );
}

const estilos = StyleSheet.create({
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colores.vidrioFuerte,
    borderWidth: 1,
    borderColor: colores.borde,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  inicial: { color: colores.texto, fontSize: 34, fontWeight: '700' },
  nombre: { color: colores.texto, fontSize: 20, fontWeight: '700' },
  email: { color: colores.textoSuave, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  rol: { color: colores.acento, fontSize: 12, fontWeight: '700', marginTop: 6, letterSpacing: 0.8, textTransform: 'uppercase' },
});
