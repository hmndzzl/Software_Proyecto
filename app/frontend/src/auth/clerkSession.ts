// Puente entre la sesión de Clerk (que vive en hooks de React) y el código que
// no es React, como los interceptores de axios. Mientras dura la migración,
// Clerk es opcional: sin VITE_CLERK_PUBLISHABLE_KEY todo sigue con el JWT propio.
export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
export const CLERK_ENABLED = Boolean(CLERK_PUBLISHABLE_KEY);

// Marca en localStorage qué proveedor creó la sesión actual.
export const AUTH_PROVIDER_KEY = 'authProvider';

// Si Clerk no termina de cargar, no se bloquean las peticiones para siempre.
const READY_TIMEOUT_MS = 5_000;

type TokenGetter = () => Promise<string | null>;
type SignOut = () => Promise<void>;

let tokenGetter: TokenGetter | null = null;
let signOutFn: SignOut | null = null;
let markReady: () => void = () => {};
const ready = new Promise<void>((resolve) => { markReady = resolve; });

export function registerClerkSession(getToken: TokenGetter, signOut: SignOut) {
  tokenGetter = getToken;
  signOutFn = signOut;
  markReady();
}

export function clearClerkSession() {
  tokenGetter = null;
  signOutFn = null;
  markReady();
}

/** Token de sesión de Clerk vigente, o null si no hay sesión de Clerk. */
export async function getClerkToken(): Promise<string | null> {
  if (!CLERK_ENABLED) return null;
  await Promise.race([ready, new Promise((resolve) => setTimeout(resolve, READY_TIMEOUT_MS))]);
  if (!tokenGetter) return null;
  try {
    return await tokenGetter();
  } catch {
    return null;
  }
}

export async function signOutClerk() {
  if (!signOutFn) return;
  try { await signOutFn(); } catch { /* si falla, la sesión local se limpia igual */ }
}
