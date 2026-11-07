// Botón reutilizable.
//  variante="solido" -> botón principal (color de acento)
//  variante="vidrio" -> botón secundario transparente
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colores } from '../lib/tema';

export default function Boton({ titulo, onPress, cargando, deshabilitado, variante = 'solido', style }) {
  const solido = variante === 'solido';
  const inactivo = cargando || deshabilitado;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      style={({ pressed }) => [
        estilos.boton,
        solido ? estilos.solido : estilos.vidrio,
        (pressed || inactivo) && { opacity: 0.6 },
        style,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={solido ? '#3a1c71' : colores.texto} />
      ) : (
        <Text style={[estilos.texto, solido && { color: '#3a1c71' }]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  solido: { backgroundColor: colores.acento, borderColor: 'rgba(255,255,255,0.6)' },
  vidrio: { backgroundColor: colores.vidrioFuerte, borderColor: colores.borde },
  texto: { color: colores.texto, fontWeight: '700', fontSize: 16 },
});
