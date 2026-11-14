// Título de cada pantalla, con botón "volver" opcional.
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colores } from '../lib/tema';

export default function Encabezado({ titulo, subtitulo, onVolver, derecha }) {
  return (
    <View style={estilos.contenedor}>
      {onVolver ? (
        <Pressable onPress={onVolver} style={estilos.volver} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={colores.texto} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={estilos.titulo} numberOfLines={1}>{titulo}</Text>
        {subtitulo ? <Text style={estilos.subtitulo}>{subtitulo}</Text> : null}
      </View>
      {derecha}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 12,
  },
  volver: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colores.vidrioFuerte,
    borderColor: colores.borde,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { color: colores.texto, fontSize: 24, fontWeight: '700', letterSpacing: 0.2 },
  subtitulo: { color: colores.textoSuave, fontSize: 13, marginTop: 2 },
});
