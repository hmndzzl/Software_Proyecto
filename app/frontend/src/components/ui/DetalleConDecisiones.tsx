import { useEffect, useState, type ReactNode } from 'react';
import apiClient from '../../api/client';
import Modal from './Modal';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import styles from './DetalleConDecisiones.module.css';
import { formatFechaHora } from '../../utils/date';

export interface Decision {
  id: number;
  resultado: 'aprobada' | 'rechazada' | 'pendiente' | 'cancelada' | 'baja';
  actor_id: number | null;
  actor_nombre: string;
  fecha: string;
}

const RESULTADO: Record<Decision['resultado'], string> = {
  baja: 'Dada de baja', aprobada: 'Aprobada', rechazada: 'Rechazada', pendiente: 'Devuelta a pendiente', cancelada: 'Cancelada',
};
export function fechaDecision(fecha: string): string {
  return formatFechaHora(fecha);
}

interface Props {
  titulo: string;
  endpoint: string;
  campos: Array<{ etiqueta: string; valor: ReactNode }>;
  onClose: () => void;
}

export default function DetalleConDecisiones({ titulo, endpoint, campos, onClose }: Props) {
  const [datos, setDatos] = useState<Decision[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'error' | 'listo'>('cargando');
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    let vigente = true;
    setEstado('cargando');
    apiClient.get<Decision[]>(endpoint)
      .then(res => { if (vigente) { setDatos(res.data); setEstado('listo'); } })
      .catch(() => { if (vigente) setEstado('error'); });
    return () => { vigente = false; };
  }, [endpoint, intento]);
  return <Modal open title={titulo} onClose={onClose} width={640}>
    <dl className={styles.campos}>
      {campos.map(campo => <div key={campo.etiqueta}><dt>{campo.etiqueta}</dt><dd>{campo.valor}</dd></div>)}
    </dl>
    <h3 className={styles.titulo}>Historial de decisiones</h3>
    {estado === 'cargando' && <LoadingState label="Cargando decisiones..." />}
    {estado === 'error' && <ErrorState message="No se pudo cargar el historial de decisiones." onRetry={() => setIntento(n => n + 1)} />}
    {estado === 'listo' && (datos.length === 0
      ? <p className={styles.ayuda}>No hay decisiones registradas. Las decisiones anteriores a la incorporación del historial no tienen autor ni fecha disponibles.</p>
      : <ol className={styles.historial} aria-label="Decisiones registradas">
        {datos.map(decision => <li key={decision.id} data-resultado={decision.resultado}>
          <strong>{RESULTADO[decision.resultado]}</strong>
          <span>Por {decision.actor_nombre}</span>
          <time dateTime={decision.fecha}>{fechaDecision(decision.fecha)}</time>
        </li>)}
      </ol>)}
  </Modal>;
}
