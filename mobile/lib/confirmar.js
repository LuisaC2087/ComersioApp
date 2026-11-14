// Cuadro de confirmación que funciona igual en el celular y en el navegador.
// Uso:  confirmar('¿Eliminar?', 'Se borrará el producto', () => { ... });
import { Alert, Platform } from 'react-native';

export function confirmar(titulo, mensaje, alAceptar) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${titulo}\n${mensaje}`)) alAceptar();
    return;
  }
  Alert.alert(titulo, mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Aceptar', style: 'destructive', onPress: alAceptar },
  ]);
}
