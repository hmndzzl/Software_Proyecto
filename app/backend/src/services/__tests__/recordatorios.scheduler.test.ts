import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { enviarRecordatorios } from '../recordatorios.service';
import { iniciarRecordatorios, INTERVALO_RECORDATORIOS_MS } from '../recordatorios.scheduler';

vi.mock('../recordatorios.service', () => ({ enviarRecordatorios: vi.fn() }));
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(enviarRecordatorios).mockReset().mockResolvedValue({ enviados: 0, omitidos: 0, errores: 0 });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

it('ejecuta al arrancar, cada 15 minutos y se detiene al cerrar', async () => {
  const detener = iniciarRecordatorios();
  expect(enviarRecordatorios).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(INTERVALO_RECORDATORIOS_MS);
  expect(enviarRecordatorios).toHaveBeenCalledTimes(2);
  detener();
  await vi.advanceTimersByTimeAsync(INTERVALO_RECORDATORIOS_MS * 2);
  expect(enviarRecordatorios).toHaveBeenCalledTimes(2);
});

it('no solapa ciclos pendientes', async () => {
  let terminar!: (r: { enviados: number; omitidos: number; errores: number }) => void;
  vi.mocked(enviarRecordatorios).mockReturnValueOnce(new Promise(resolve => { terminar = resolve; }));
  const detener = iniciarRecordatorios();
  await vi.advanceTimersByTimeAsync(INTERVALO_RECORDATORIOS_MS * 3);
  expect(enviarRecordatorios).toHaveBeenCalledTimes(1);
  terminar({ enviados: 0, omitidos: 0, errores: 0 });
  await vi.advanceTimersByTimeAsync(INTERVALO_RECORDATORIOS_MS);
  expect(enviarRecordatorios).toHaveBeenCalledTimes(2);
  detener();
});

it('registra fallos y vuelve a intentar en el siguiente ciclo', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const info = vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.mocked(enviarRecordatorios).mockRejectedValueOnce(new Error('BD sin conexión'))
    .mockResolvedValueOnce({ enviados: 1, omitidos: 0, errores: 0 });
  const detener = iniciarRecordatorios();
  await vi.advanceTimersByTimeAsync(INTERVALO_RECORDATORIOS_MS);
  expect(log).toHaveBeenCalledTimes(1);
  expect(info).toHaveBeenCalledWith('Recordatorios de servicios:', { enviados: 1, omitidos: 0, errores: 0 });
  detener();
});
