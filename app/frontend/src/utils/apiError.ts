type ErrorMessageKey = 'mensaje' | 'message';

function esRegistro(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function obtenerRespuesta(error: unknown): Record<string, unknown> | undefined {
  return esRegistro(error) && esRegistro(error.response) ? error.response : undefined;
}

/** Obtiene un mensaje del backend sin asumir la forma del error recibido. */
export function getApiErrorMessage(
  error: unknown,
  fallback: string,
  key: ErrorMessageKey = 'mensaje',
): string {
  const data = obtenerRespuesta(error)?.data;
  if (!esRegistro(data)) return fallback;

  const message = data[key];
  return typeof message === 'string' && message.length > 0 ? message : fallback;
}

/** Devuelve el código HTTP solo cuando el error proviene de Axios. */
export function getApiErrorStatus(error: unknown): number | undefined {
  const status = obtenerRespuesta(error)?.status;
  return typeof status === 'number' ? status : undefined;
}
