import { useState, useEffect } from 'react';
import apiClient from '../../../api/client';
import { CardHead } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import type { BadgeKind } from '../../../components/ui/Badge';
import Btn from '../../../components/ui/Btn';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../../components/ui/EmptyState';
import { formatFecha } from '../../../utils/date';
import styles from './ListaCambiosTurno.module.css';

type CambioTurnoEstado = 'pendiente' | 'aceptado' | 'rechazado';

interface CambioTurno {
  id: number;
  tarea_id: number;
  solicitante_id: number;
  destinatario_id: number;
  estado: CambioTurnoEstado;
  solicitante_nombre: string;
  destinatario_nombre: string;
  tarea_descripcion: string;
  tarea_fecha: string;
  tarea_hora_inicio: string;
  tarea_hora_fin: string;
}

const ESTADO_LABEL: Record<CambioTurnoEstado, string> = {
  pendiente: 'Pendiente',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
};

const ESTADO_BADGE: Record<CambioTurnoEstado, BadgeKind> = {
  pendiente: 'pendiente',
  aceptado: 'confirmada',
  rechazado: 'rechazada',
};

export default function ListaCambiosTurno({ refreshKey }: { refreshKey?: number }) {
  const usuarioInfo = localStorage.getItem('usuario');
  const usuario = usuarioInfo ? JSON.parse(usuarioInfo) : null;

  const [cambios, setCambios] = useState<CambioTurno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarCambios = () => {
    setLoading(true);
    setError('');
    apiClient.get('/api/cambios-turno')
      .then(res => setCambios(res.data))
      .catch(() => setError('Error al cargar las solicitudes de cambio de turno.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarCambios();
  }, [refreshKey]);

  const responder = async (id: number, aceptar: boolean) => {
    setMensaje('');
    try {
      const res = await apiClient.put(`/api/cambios-turno/${id}/responder`, { aceptar });
      setMensaje(res.data.mensaje);
      cargarCambios();
    } catch (err: any) {
      alert(err.response?.data?.mensaje || 'Error al responder la solicitud de cambio de turno');
    }
  };

  if (loading) return <LoadingState label="Cargando solicitudes de cambio de turno..." />;
  if (error) return <ErrorState message={error} onRetry={cargarCambios} />;

  const recibidas = usuario ? cambios.filter(c => c.destinatario_id === usuario.id) : [];
  const enviadas = usuario ? cambios.filter(c => c.solicitante_id === usuario.id) : [];

  return (
    <div>
      <CardHead title="Cambios de Turno" hint={!loading ? `${cambios.length} solicitudes` : undefined} />

      {mensaje && <p className={styles.mensajeExito}>{mensaje}</p>}

      <h3 className={styles.seccionTitulo}>Solicitudes Recibidas</h3>
      {recibidas.length === 0 ? (
        <EmptyState message="No has recibido solicitudes de cambio de turno." />
      ) : (
        <div className="table-container">
          <table className="styled-table">
            <thead>
              <tr>
                <th>Tarea</th>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Solicitante</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {recibidas.map((c) => (
                <tr key={c.id}>
                  <td>{c.tarea_descripcion}</td>
                  <td className={styles.horaCell}>{formatFecha(c.tarea_fecha)}</td>
                  <td className={styles.horaCell}>{c.tarea_hora_inicio.substring(0, 5)}-{c.tarea_hora_fin.substring(0, 5)}</td>
                  <td>{c.solicitante_nombre}</td>
                  <td><Badge kind={ESTADO_BADGE[c.estado]}>{ESTADO_LABEL[c.estado]}</Badge></td>
                  <td>
                    {c.estado === 'pendiente' && (
                      <div className={styles.acciones}>
                        <Btn kind="ok" size="sm" onClick={() => responder(c.id, true)}>Aceptar</Btn>
                        <Btn kind="bad" size="sm" onClick={() => responder(c.id, false)}>Rechazar</Btn>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className={styles.seccionTitulo}>Mis Solicitudes Enviadas</h3>
      {enviadas.length === 0 ? (
        <EmptyState message="No has solicitado ningún cambio de turno." />
      ) : (
        <div className="table-container">
          <table className="styled-table">
            <thead>
              <tr>
                <th>Tarea</th>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Destinatario</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {enviadas.map((c) => (
                <tr key={c.id}>
                  <td>{c.tarea_descripcion}</td>
                  <td className={styles.horaCell}>{formatFecha(c.tarea_fecha)}</td>
                  <td className={styles.horaCell}>{c.tarea_hora_inicio.substring(0, 5)}-{c.tarea_hora_fin.substring(0, 5)}</td>
                  <td>{c.destinatario_nombre}</td>
                  <td><Badge kind={ESTADO_BADGE[c.estado]}>{ESTADO_LABEL[c.estado]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
