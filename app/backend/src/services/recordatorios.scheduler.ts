import { enviarRecordatorios } from './recordatorios.service';

export const INTERVALO_RECORDATORIOS_MS = 15 * 60_000;

export function iniciarRecordatorios() {
  let ejecutando = false;
  let detenido = false;
  const ejecutar = async () => {
    if (ejecutando || detenido) return;
    ejecutando = true;
    try {
      const resultado = await enviarRecordatorios();
      if (resultado.enviados || resultado.errores) console.info('Recordatorios de servicios:', resultado);
    } catch (error) { console.error('Error en proceso de recordatorios de servicios:', error); }
    finally { ejecutando = false; }
  };
  void ejecutar();
  const timer = setInterval(() => { void ejecutar(); }, INTERVALO_RECORDATORIOS_MS);
  timer.unref();
  return () => { detenido = true; clearInterval(timer); };
}
