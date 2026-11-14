// Abre la galería del teléfono (o el selector de archivos en el navegador)
// y devuelve la foto como texto base64 listo para guardar en la base de datos:
// "data:image/jpeg;base64,...". Devuelve null si el usuario cancela.
//
// aspecto: proporción del recorte, ej. [1, 1] cuadrado o [16, 9] panorámico.
// La calidad baja (0.4) hace que la foto pese poco.
import * as ImagePicker from 'expo-image-picker';

export async function elegirImagen(aspecto = [1, 1]) {
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: aspecto,
    quality: 0.4,
    base64: true,
  });
  if (resultado.canceled) return null;

  const foto = resultado.assets[0];
  return foto.base64 ? `data:image/jpeg;base64,${foto.base64}` : foto.uri;
}
