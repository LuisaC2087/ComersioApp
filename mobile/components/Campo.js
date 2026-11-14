// Campo de texto con estilo de vidrio.
// Acepta las mismas props que un TextInput (value, onChangeText, multiline...)
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colores } from '../lib/tema';

export default function Campo({ etiqueta, style, ...props }) {
  return (
    <View style={[estilos.contenedor, style]}>
      {etiqueta ? <Text style={estilos.etiqueta}>{etiqueta}</Text> : null}
      <TextInput
        placeholderTextColor={colores.placeholder}
        autoCapitalize="none"
        style={[estilos.input, props.multiline && { minHeight: 90, textAlignVertical: 'top' }]}
        {...props}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { marginBottom: 14 },
  etiqueta: {
    color: colores.textoSuave,
    marginBottom: 6,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colores.campoFondo,
    borderColor: colores.borde,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colores.texto,
    fontSize: 15,
  },
});
