import { describe, expect, it } from 'vitest';
import { getApiErrorMessage, getApiErrorStatus } from './apiError';

describe('apiError', () => {
  it('devuelve el mensaje solicitado de una respuesta HTTP', () => {
    const error = { response: { data: { mensaje: 'No autorizado', message: 'Unauthorized' }, status: 401 } };

    expect(getApiErrorMessage(error, 'Error genérico')).toBe('No autorizado');
    expect(getApiErrorMessage(error, 'Error genérico', 'message')).toBe('Unauthorized');
    expect(getApiErrorStatus(error)).toBe(401);
  });

  it('usa el respaldo para errores sin payload o con mensajes inválidos', () => {
    expect(getApiErrorMessage(new Error('Red'), 'Sin conexión')).toBe('Sin conexión');
    expect(getApiErrorMessage({ response: { data: { mensaje: '' } } }, 'Sin conexión')).toBe('Sin conexión');
    expect(getApiErrorMessage({ response: { data: { mensaje: 12 } } }, 'Sin conexión')).toBe('Sin conexión');
    expect(getApiErrorStatus({ response: { status: '401' } })).toBeUndefined();
  });
});
