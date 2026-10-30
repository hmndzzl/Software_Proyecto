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

// ── Preferencia de UI (sidebar colapsado) ──
// No es dato de sesión, pero vive aquí porque este es el único módulo autorizado
// a tocar localStorage (DT-10); no amerita un segundo módulo exceptuado.
const SIDEBAR_COLAPSADO_KEY = 'sidebar_colapsado';
const INTERVALO_NOTIFICACIONES_KEY = 'intervalo_notificaciones';
const TEMA_APLICACION_KEY = 'tema_aplicacion';

/** Evento interno para aplicar preferencias sin recargar la aplicación. */
export const UI_PREFERENCES_EVENT = 'ui-preferences-changed';

function notificarCambioDePreferencias() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(UI_PREFERENCES_EVENT));
}

export function leerSidebarColapsado(): boolean {
  return leer(SIDEBAR_COLAPSADO_KEY) === '1';
}

export function guardarSidebarColapsado(colapsado: boolean) {
  escribir(SIDEBAR_COLAPSADO_KEY, colapsado ? '1' : '0');
  notificarCambioDePreferencias();
}

export type IntervaloNotificaciones = 60 | 300;

export function leerIntervaloNotificaciones(): IntervaloNotificaciones {
  return leer(INTERVALO_NOTIFICACIONES_KEY) === '300' ? 300 : 60;
}

export function guardarIntervaloNotificaciones(intervalo: IntervaloNotificaciones) {
  escribir(INTERVALO_NOTIFICACIONES_KEY, String(intervalo));
  notificarCambioDePreferencias();
}

export type TemaAplicacion = 'claro' | 'oscuro';

export function leerTemaAplicacion(): TemaAplicacion {
  return leer(TEMA_APLICACION_KEY) === 'oscuro' ? 'oscuro' : 'claro';
}

export function guardarTemaAplicacion(tema: TemaAplicacion) {
  escribir(TEMA_APLICACION_KEY, tema);
  notificarCambioDePreferencias();
}

export function restaurarPreferenciasUI() {
  escribir(SIDEBAR_COLAPSADO_KEY, '0');
  escribir(INTERVALO_NOTIFICACIONES_KEY, '60');
  escribir(TEMA_APLICACION_KEY, 'claro');
  notificarCambioDePreferencias();
}

// ── Sincronización de notificaciones entre TopBar y /notificaciones ──
// Ninguna de las dos pantallas comparte estado; este evento le avisa al TopBar
// que debe refrescar su insignia de inmediato tras una acción en /notificaciones,
// en vez de esperar al siguiente ciclo de sondeo (hasta 5 minutos).
export const NOTIFICACIONES_EVENT = 'notificaciones-changed';

export function notificarCambioDeNotificaciones() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NOTIFICACIONES_EVENT));
}
