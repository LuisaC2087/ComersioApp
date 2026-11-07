// Título de cada pantalla, con botón "volver" opcional.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colores } from '../lib/tema';

export default function Encabezado({ titulo, subtitulo, onVolver }) {
  return (
    <View style={estilos.contenedor}>
      {onVolver ? (
        <Pressable onPress={onVolver} style={estilos.volver} hitSlop={10}>
          <Text style={estilos.volverTexto}>‹</Text>
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={estilos.titulo}>{titulo}</Text>
        {subtitulo ? <Text style={estilos.subtitulo}>{subtitulo}</Text> : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  volver: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colores.vidrioFuerte,
    borderColor: colores.borde,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  volverTexto: { color: colores.texto, fontSize: 28, lineHeight: 30, marginTop: -2 },
  titulo: { color: colores.texto, fontSize: 28, fontWeight: '800' },
  subtitulo: { color: colores.textoSuave, fontSize: 14, marginTop: 2 },
});
