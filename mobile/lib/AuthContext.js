// ============================================================
//  SESIÓN DEL USUARIO
//  Comparte "sesion" con todas las pantallas y la guarda en SQLite,
//  así al abrir la app de nuevo el usuario sigue conectado.
// ============================================================
import { createContext, useContext, useState } from 'react';
import { borrarCache, borrarSesion, guardarSesion, leerSesion, vaciarCarrito } from './db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Al arrancar, leemos la sesión guardada en el teléfono (o null)
  const [sesion, setSesion] = useState(() => leerSesion());

  function iniciarSesion(token, usuario) {
    guardarSesion(token, usuario);
    setSesion({ token, usuario });
  }

  function cerrarSesion() {
    borrarSesion();
    vaciarCarrito();
    borrarCache();
    setSesion(null);
  }

  return (
    <AuthContext.Provider value={{ sesion, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

// Uso en cualquier pantalla:  const { sesion, cerrarSesion } = useAuth();
export const useAuth = () => useContext(AuthContext);
