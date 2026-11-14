// ============================================================
//  TEMA GLASSMORPHISM CLARO Y MINIMALISTA
//  TODOS los colores de la app están aquí: cámbialos y cambia toda la app.
//
//  La receta del glassmorphism:
//   1. Un fondo claro con "luces" de color que se difuminan (components/Fondo.js).
//   2. Tarjetas de vidrio: blancas semitransparentes + desenfoque (blur)
//      + un borde blanco fino que simula el filo del vidrio.
//   3. Un solo color de acento y mucho espacio libre.
// ============================================================
export const colores = {
  // ---- Fondo ----
  degradado: ['#f8f6ff', '#eef4ff', '#fdf3f9'], // degradado base, de arriba-izquierda a abajo-derecha
  luz1: '#c4b5fd', // lila      (arriba a la izquierda)
  luz2: '#93c5fd', // celeste   (a la derecha)
  luz3: '#f9a8d4', // rosado    (abajo)

  // ---- Vidrio ----
  vidrio: 'rgba(255, 255, 255, 0.45)',
  vidrioFuerte: 'rgba(255, 255, 255, 0.7)',
  borde: 'rgba(255, 255, 255, 0.9)',
  sombra: '#6d5dfc',
  tintaBlur: 'light', // tipo de desenfoque de expo-blur: 'light' | 'dark'

  // ---- Texto ----
  texto: '#1e1b3a',
  textoSuave: 'rgba(30, 27, 58, 0.55)',
  acento: '#6d5dfc',

  // ---- Botón principal (oscuro sobre fondo claro) ----
  botonFondo: '#1e1b3a',
  botonTexto: '#ffffff',

  // ---- Campos de texto ----
  campoFondo: 'rgba(255, 255, 255, 0.6)',
  placeholder: 'rgba(30, 27, 58, 0.35)',

  // ---- Mensajes y estados ----
  exito: '#16a34a',
  advertencia: '#d97706',
  error: '#dc2626',
  errorFondo: 'rgba(220, 38, 38, 0.08)',
  avisoFondo: 'rgba(255, 255, 255, 0.7)',

  // ---- Barras del sistema ----
  barraPestanas: 'rgba(255, 255, 255, 0.55)',
  barraEstado: 'dark', // color de la hora/batería: 'dark' sobre fondo claro
};

export const radio = 20;
