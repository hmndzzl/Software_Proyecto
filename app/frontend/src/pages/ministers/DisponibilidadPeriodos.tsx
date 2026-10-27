import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import Modal from '../../components/ui/Modal';
import Btn from '../../components/ui/Btn';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import { getApiErrorMessage } from '../../utils/apiError';
import type { Ministro } from '../../types';
import styles from '../../styles/Form.module.css';

import type { PeriodoDisponibilidad } from '../../api/disponibilidad';
export const textoFechaHora = (value: string) => {
  const [fecha, hora] = value.split('T');
  return `${fecha.split('-').reverse().join('/')} ${hora}`;
};

export default function DisponibilidadPeriodos({ ministro, onClose }: { ministro: Ministro; onClose: () => void }) {
  const [periodos, setPeriodos] = useState<PeriodoDisponibilidad[]>([]);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [intento, setIntento] = useState(0);
  const url = `/api/personas/${ministro.id}/disponibilidad/periodos`;
  useEffect(() => {
    let vigente = true;
    apiClient.get<PeriodoDisponibilidad[]>(url).then(res => { if (vigente) { setPeriodos(res.data); setError(''); } })
      .catch(() => { if (vigente) setError('No se pudieron cargar los periodos.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [url, intento]);
  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (ocupado) return;
    if (!desde || !hasta || desde >= hasta) { setError('El inicio debe ser anterior al fin.'); return; }
    setOcupado(true); setError('');
    try {
      const res = await apiClient.post<PeriodoDisponibilidad>(url, { desde, hasta });
      setPeriodos(prev => [...prev, res.data].sort((a, b) => a.desde.localeCompare(b.desde)));
      setDesde(''); setHasta('');
    } catch (err) { setError(getApiErrorMessage(err, 'No se pudo guardar el periodo.')); }
    finally { setOcupado(false); }
  };
  const eliminar = async (id: number) => {
    setOcupado(true); setError('');
    try {
      await apiClient.delete(`${url}/${id}`);
      setPeriodos(prev => prev.filter(p => p.origen !== 'disponibilidad' || p.id !== id));
    } catch (err) { setError(getApiErrorMessage(err, 'No se pudo quitar el periodo.')); }
    finally { setOcupado(false); }
  };
  return <Modal open title={`Disponibilidad de ${ministro.nombre}`} onClose={onClose} closeDisabled={ocupado}>
    <p>Periodos no disponibles, en horario de Guatemala. Al terminar un periodo deja de afectar las asignaciones. La disponibilidad general se conserva.</p>
    {cargando && <LoadingState label="Cargando periodos..." />}
    {error && <ErrorState message={error} onRetry={() => { setCargando(true); setIntento(i => i + 1); }} />}
    {!cargando && <>
      {!periodos.length && <p>No hay periodos registrados.</p>}
      <ul>{periodos.map(p => <li key={`${p.origen}-${p.id}`}>
        <p>Desde {textoFechaHora(p.desde)}. Disponible nuevamente el {textoFechaHora(p.hasta)}.</p>
        {p.origen === 'ausencia' ? <span>Ausencia reportada · incluye todos los días indicados en el reporte</span>
          : <Btn type="button" kind="ghost" size="sm" disabled={ocupado} onClick={() => eliminar(p.id)} aria-label={`Quitar periodo del ${textoFechaHora(p.desde)}`}>Quitar periodo</Btn>}
      </li>)}</ul>
      <form onSubmit={guardar} className={styles.form}>
        <label htmlFor="periodo-desde">No disponible desde</label>
        <input id="periodo-desde" className={styles.input} type="datetime-local" required value={desde} onChange={e => setDesde(e.target.value)} disabled={ocupado} />
        <label htmlFor="periodo-hasta">Disponible nuevamente el</label>
        <input id="periodo-hasta" className={styles.input} type="datetime-local" required value={hasta} onChange={e => setHasta(e.target.value)} disabled={ocupado} />
        <Btn kind="primary" type="submit" disabled={ocupado}>{ocupado ? 'Guardando...' : 'Agregar periodo no disponible'}</Btn>
      </form>
    </>}
  </Modal>;
}
