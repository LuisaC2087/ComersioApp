// Pestaña PERFIL (ruta "/perfil")
import { StyleSheet, Text, View } from 'react-native';
import Boton from '../../components/Boton';
import Encabezado from '../../components/Encabezado';
import Fondo from '../../components/Fondo';
import Tarjeta from '../../components/Tarjeta';
import { useAuth } from '../../lib/AuthContext';
import { colores } from '../../lib/tema';

export default function Perfil() {
  const { sesion, cerrarSesion } = useAuth();
  const { nombre, email } = sesion.usuario;

  return (
    <Fondo>
      <Encabezado titulo="Perfil" />
      <View style={{ padding: 20, gap: 16 }}>
        <Tarjeta style={{ alignItems: 'center', paddingVertical: 30 }}>
          <View style={estilos.avatar}>
            <Text style={estilos.inicial}>{nombre.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={estilos.nombre}>{nombre}</Text>
          <Text style={estilos.email}>{email}</Text>
        </Tarjeta>

        <Tarjeta>
          <Text style={estilos.email}>
            Tu sesión, tu carrito y una copia del catálogo y de tus compras se guardan en el
            teléfono (SQLite), para que puedas verlos aunque no tengas internet.
          </Text>
        </Tarjeta>

        <Boton titulo="Cerrar sesión" variante="vidrio" onPress={cerrarSesion} />
      </View>
    </Fondo>
  );
}

const estilos = StyleSheet.create({
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colores.vidrioFuerte,
    borderWidth: 2,
    borderColor: colores.borde,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  inicial: { color: colores.texto, fontSize: 40, fontWeight: '800' },
  nombre: { color: colores.texto, fontSize: 22, fontWeight: '800' },
  email: { color: colores.textoSuave, fontSize: 14, textAlign: 'center' },
});
