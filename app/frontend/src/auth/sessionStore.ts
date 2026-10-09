// Único módulo que toca localStorage para la sesión (DT-10). El resto de la app
// obtiene el estado de autenticación con useAuth(); una regla de ESLint impide
// usar localStorage fuera de este archivo.
export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol_id: number;
}

const TOKEN_KEY = 'token';
const USUARIO_KEY = 'usuario';
const PROVIDER_KEY = 'authProvider';

export type AuthProvider = 'clerk';

function leer(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function escribir(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* sin almacenamiento la sesión solo vive en memoria */ }
}

function borrar(key: string) {
  try { localStorage.removeItem(key); } catch { /* nada que limpiar */ }
}

export function readUsuario(): Usuario | null {
  const stored = leer(USUARIO_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === 'object' ? (parsed as Usuario) : null;
  } catch {
    return null;
  }
}

export function readToken(): string | null {
  return leer(TOKEN_KEY);
}

export function saveSession(token: string, usuario: Usuario) {
  escribir(TOKEN_KEY, token);
  escribir(USUARIO_KEY, JSON.stringify(usuario));
}

/** Actualiza los datos del usuario sin tocar el token. */
export function saveUsuario(usuario: Usuario) {
  escribir(USUARIO_KEY, JSON.stringify(usuario));
}

export function saveToken(token: string) {
  escribir(TOKEN_KEY, token);
}

export function readAuthProvider(): AuthProvider | null {
  return leer(PROVIDER_KEY) === 'clerk' ? 'clerk' : null;
}

export function saveAuthProvider(provider: AuthProvider) {
  escribir(PROVIDER_KEY, provider);
}

export function clearSession() {
  borrar(TOKEN_KEY);
  borrar(USUARIO_KEY);
  borrar(PROVIDER_KEY);
}

/** Claves cuyo cambio en otra pestaña implica que la sesión cambió. */
export function esClaveDeSesion(key: string | null): boolean {
  return key === null || key === TOKEN_KEY || key === USUARIO_KEY;
}
