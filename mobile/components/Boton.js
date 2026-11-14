// Botón reutilizable.
//  variante="solido"  -> botón principal (claro, texto oscuro)
//  variante="vidrio"  -> botón secundario transparente
//  variante="peligro" -> acciones destructivas (borrar)
//  icono="print-outline" -> agrega un ícono de Ionicons a la izquierda
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colores } from '../lib/tema';

export default function Boton({ titulo, onPress, cargando, deshabilitado, variante = 'solido', icono, style }) {
  const solido = variante === 'solido';
  const inactivo = cargando || deshabilitado;
  const colorTexto = solido ? colores.botonTexto : variante === 'peligro' ? colores.error : colores.texto;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      style={({ pressed }) => [
        estilos.boton,
        solido ? estilos.solido : estilos.vidrio,
        (pressed || inactivo) && { opacity: 0.55 },
        style,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={colorTexto} />
      ) : (
        <>
          {icono ? <Ionicons name={icono} size={18} color={colorTexto} /> : null}
          <Text style={[estilos.texto, { color: colorTexto }]}>{titulo}</Text>
        </>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  solido: { backgroundColor: colores.botonFondo, borderColor: 'transparent' },
  vidrio: { backgroundColor: colores.vidrioFuerte, borderColor: colores.borde },
  texto: { fontWeight: '600', fontSize: 15, letterSpacing: 0.2 },
});
