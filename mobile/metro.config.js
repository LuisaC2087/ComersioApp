// Configuración de Metro (el empaquetador de Expo).
// Solo hace falta para que SQLite funcione también en el navegador (versión web).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// SQLite en web usa un archivo WebAssembly (.wasm)
config.resolver.assetExts.push('wasm');

// SQLite en web necesita estas cabeceras de seguridad (aquí, para "npx expo start --web").
// En Render se configuran en render.yaml.
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  middleware(req, res, next);
};

module.exports = config;
