// Etiqueta de color con el estado de un pedido: pagado, enviado, entregado, cancelado.
import { StyleSheet, Text, View } from 'react-native';
import { colores } from '../lib/tema';

const COLORES_ESTADO = {
  pagado: colores.acento,
  enviado: '#fbbf24',
  entregado: colores.exito,
  cancelado: colores.error,
};

export default function EstadoPedido({ estado = 'pagado' }) {
  const color = COLORES_ESTADO[estado] || colores.textoSuave;
  return (
    <View style={[estilos.chip, { borderColor: color }]}>
      <Text style={[estilos.texto, { color }]}>{estado}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  texto: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});
