// ============================================================
//  CARRUSEL de la pantalla de inicio (modelos y promociones)
//
//  Uso:  <Carrusel banners={lista} />
//  Cada banner: { id, titulo, subtitulo, imagen, producto_id }
//
//  - Se desliza con el dedo y avanza solo cada SEGUNDOS segundos.
//  - Si el banner tiene producto_id, al tocarlo abre ese producto.
//  - Los banners se cargan desde el panel de administrador.
// ============================================================
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colores, radio } from '../lib/tema';

const SEGUNDOS = 4;
const ALTO = 190;

export default function Carrusel({ banners }) {
  const scroll = useRef(null);
  const [ancho, setAncho] = useState(0); // ancho real del carrusel (se mide al dibujarse)
  const [actual, setActual] = useState(0); // índice del banner visible

  // Avance automático: cada SEGUNDOS pasa al siguiente (y vuelve al primero)
  useEffect(() => {
    if (banners.length < 2 || !ancho) return;
    const temporizador = setInterval(() => {
      const siguiente = (actual + 1) % banners.length;
      scroll.current?.scrollTo({ x: siguiente * ancho, animated: true });
      setActual(siguiente);
    }, SEGUNDOS * 1000);
    return () => clearInterval(temporizador);
  }, [actual, ancho, banners.length]);

  if (banners.length === 0) return null;

  // Cuando el usuario desliza con el dedo, calculamos qué banner quedó visible
  function alDeslizar(e) {
    if (!ancho) return;
    const indice = Math.round(e.nativeEvent.contentOffset.x / ancho);
    if (indice !== actual) setActual(indice);
  }

  return (
    <View style={estilos.contenedor}>
      <ScrollView
        ref={scroll}
        // Medimos el área que se desliza: cada banner ocupa exactamente ese ancho
        onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={alDeslizar}
        scrollEventThrottle={16}
      >
        {banners.map((b) => (
          <Pressable
            key={b.id}
            style={{ width: ancho, height: ALTO }}
            disabled={!b.producto_id}
            onPress={() => router.push(`/producto/${b.producto_id}`)}
          >
            <Image source={{ uri: b.imagen }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            {/* Degradado oscuro abajo para que el texto se lea sobre cualquier foto */}
            <LinearGradient
              colors={['transparent', 'rgba(20, 16, 50, 0.65)']}
              style={estilos.sombraTexto}
            />
            <View style={estilos.textos}>
              <Text style={estilos.titulo} numberOfLines={1}>{b.titulo}</Text>
              {b.subtitulo ? <Text style={estilos.subtitulo} numberOfLines={2}>{b.subtitulo}</Text> : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Puntos indicadores */}
      {banners.length > 1 ? (
        <View style={estilos.puntos}>
          {banners.map((b, i) => (
            <View key={b.id} style={[estilos.punto, i === actual && estilos.puntoActivo]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    height: ALTO,
    borderRadius: radio,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.vidrio,
  },
  sombraTexto: { position: 'absolute', left: 0, right: 0, bottom: 0, height: ALTO * 0.6 },
  textos: { position: 'absolute', left: 18, right: 18, bottom: 26 },
  titulo: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  subtitulo: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 3 },
  puntos: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  puntoActivo: { width: 18, backgroundColor: '#ffffff' },
});
