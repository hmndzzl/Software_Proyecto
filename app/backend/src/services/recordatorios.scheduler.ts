import { enviarRecordatorios, enviarRecordatoriosTardios } from './recordatorios.service';

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
  // Solo al arrancar: cubre tareas cuya ventana normal de 24-48h se cumplió por
  // completo mientras el proceso estaba apagado. No forma parte del ciclo de 15
  // minutos — repetirla ahí no tendría sentido, ya cubre una ventana fija desde "ahora".
  const ejecutarTardios = async () => {
    if (detenido) return;
    try {
      const resultado = await enviarRecordatoriosTardios();
      if (resultado.enviados || resultado.errores) console.info('Recordatorios tardíos de servicios:', resultado);
    } catch (error) { console.error('Error en recordatorios tardíos de servicios:', error); }
  };
  void ejecutar();
  void ejecutarTardios();
  const timer = setInterval(() => { void ejecutar(); }, INTERVALO_RECORDATORIOS_MS);
  timer.unref();
  return () => { detenido = true; clearInterval(timer); };
}
