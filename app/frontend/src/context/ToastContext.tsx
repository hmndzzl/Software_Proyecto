import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import Toast, { type ToastKind, type ToastAction } from '../components/ui/Toast';

interface ToastData {
  id: number;
  kind: ToastKind;
  title: string;
  message: string;
  action?: ToastAction;
}

interface ToastApi {
  /** Confirma una acción que salió bien. */
  success: (title: string, message: string, action?: ToastAction) => void;
  /** Avisa que la acción se hizo, pero con un problema que conviene atender. */
  warning: (title: string, message: string, action?: ToastAction) => void;
  /** Avisa que una acción falló. */
  error: (title: string, message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Muestra un solo aviso a la vez, en la esquina inferior derecha; uno nuevo reemplaza al anterior.
 * Vive en la raíz de la app, así el aviso sigue visible aunque el formulario que lo originó se cierre.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const nextId = useRef(0);

  const show = useCallback((kind: ToastKind, title: string, message: string, action?: ToastAction) => {
    nextId.current += 1;
    setToast({ id: nextId.current, kind, title, message, action });
  }, []);

  const close = useCallback(() => setToast(null), []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, message, action) => show('ok', title, message, action),
      warning: (title, message, action) => show('warn', title, message, action),
      error: (title, message) => show('bad', title, message),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && <Toast key={toast.id} kind={toast.kind} title={toast.title} message={toast.message} onClose={close} action={toast.action} />}
    </ToastContext.Provider>
  );
}

/**
 * @example
 * const toast = useToast();
 * toast.success('Grupo creado', 'El grupo "Jóvenes" ya está disponible.');
 * toast.error('No se pudo crear el grupo', error.response?.data?.mensaje ?? 'Intenta de nuevo.');
 */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}
