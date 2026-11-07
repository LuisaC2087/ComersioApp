// Campo de texto con estilo de vidrio.
// Acepta las mismas props que un TextInput (value, onChangeText, etc.)
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colores } from '../lib/tema';

export default function Campo({ etiqueta, style, ...props }) {
  return (
    <View style={[estilos.contenedor, style]}>
      {etiqueta ? <Text style={estilos.etiqueta}>{etiqueta}</Text> : null}
      <TextInput
        placeholderTextColor="rgba(255,255,255,0.5)"
        autoCapitalize="none"
        style={estilos.input}
        {...props}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { marginBottom: 14 },
  etiqueta: { color: colores.textoSuave, marginBottom: 6, fontSize: 13 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: colores.borde,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colores.texto,
    fontSize: 16,
  },
});
