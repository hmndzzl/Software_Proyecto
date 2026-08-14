import { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import { CardHead } from '../.././../components/ui/Card';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../../components/ui/EmptyState';
import styles from './ListaReservas.module.css';
import formStyles from '../../../styles/Form.module.css';

interface Espacio {
  id: number;
  nombre: string;
}

interface Reserva {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  espacio_id: number | null;
  espacio_nombre: string | null;
  estado_reserva_id: number;
  solicitante_id: number;
  evento_titulo: string | null;
  evento_descripcion: string | null;
}

const ESTADO_LABEL: Record<number, string> = {
  1: 'Pendiente',
  2: 'Confirmada',
  3: 'Rechazada'
};

const ESTADO_BADGE_CLASS: Record<number, string> = {
  1: styles.badgePendiente,
  2: styles.badgeConfirmada,
  3: styles.badgeRechazada,
};

export default function ListaReservas({ refreshKey }: { refreshKey?: number }) {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editando, setEditando] = useState<Reserva | null>(null);
  const [editFecha, setEditFecha] = useState('');
  const [editHoraInicio, setEditHoraInicio] = useState('');
  const [editHoraFin, setEditHoraFin] = useState('');
  const [editEspacioId, setEditEspacioId] = useState('');
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editMensaje, setEditMensaje] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const usuarioInfo = localStorage.getItem('usuario');
  const usuario = usuarioInfo ? JSON.parse(usuarioInfo) : null;
  const esAdminOSacerdote = usuario && (usuario.rol_id === 1 || usuario.rol_id === 5);

  const fetchReservas = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/api/reservas');
      setReservas(response.data);
    } catch {
      setError('Error de red al obtener las reservas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservas();
    apiClient.get('/api/espacios').then(res => setEspacios(res.data)).catch(() => {});
  }, [refreshKey]);

  const cambiarEstado = async (id: number, nuevoEstado: number) => {
    try {
      await apiClient.put(`/api/reservas/${id}/estado`, { estado_id: nuevoEstado });
      fetchReservas();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al cambiar el estado de la reserva');
    }
  };

  const abrirEdicion = (r: Reserva) => {
    setEditando(r);
    setEditFecha(r.fecha.split('T')[0]);
    setEditHoraInicio(r.hora_inicio.substring(0, 5));
    setEditHoraFin(r.hora_fin.substring(0, 5));
    setEditEspacioId(r.espacio_id ? String(r.espacio_id) : '');
    setEditTitulo(r.evento_titulo ?? '');
    setEditDescripcion(r.evento_descripcion ?? '');
    setEditMensaje('');
  };

  const cerrarEdicion = () => {
    setEditando(null);
    setEditMensaje('');
  };

  const guardarEdicion = async () => {
    if (!editFecha || !editHoraInicio || !editHoraFin || !editEspacioId || !editTitulo || !editDescripcion) {
      setEditMensaje('Por favor completa todos los campos.');
      return;
    }
    if (editHoraInicio >= editHoraFin) {
      setEditMensaje('La hora de inicio debe ser menor que la hora de fin.');
      return;
    }
    setEditLoading(true);
    setEditMensaje('');
    try {
      await apiClient.put(`/api/reservas/${editando!.id}`, {
        fecha: editFecha,
        hora_inicio: editHoraInicio,
        hora_fin: editHoraFin,
        espacio_id: Number(editEspacioId),
        titulo: editTitulo,
        descripcion: editDescripcion,
      });
      cerrarEdicion();
      fetchReservas();
    } catch (err: any) {
      setEditMensaje(err.response?.data?.message || 'Error al guardar los cambios.');
    } finally {
      setEditLoading(false);
    }
  };

  const formatFecha = (fecha: string) => {
    const [year, month, day] = fecha.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  const formatHora = (hora: string) => hora.substring(0, 5);

  return (
    <div>
      <CardHead title="Lista de Reservas" hint={!loading ? `${reservas.length} registradas` : undefined} />

      {editando && (
        <div className={formStyles.modalOverlay}>
          <div className={formStyles.modalCard}>
            <h4 className={formStyles.modalTitle}>Editar Reserva #{editando.id}</h4>

            {editando.estado_reserva_id !== 1 && (
              <div className={formStyles.modalWarning}>
                Esta reserva volverá a estado <strong>Pendiente</strong> para re-aprobación.
              </div>
            )}

            {editMensaje && (
              <p className={`${formStyles.message} ${formStyles.messageError}`}>{editMensaje}</p>
            )}

            <div className={formStyles.form}>
              <div className={formStyles.field}>
                <label className={`${formStyles.label} ${formStyles.required}`}>Espacio:</label>
                <select className={formStyles.input} value={editEspacioId} onChange={e => setEditEspacioId(e.target.value)}>
                  <option value="">-- Selecciona un espacio --</option>
                  {espacios.map(esp => (
                    <option key={esp.id} value={esp.id}>{esp.nombre}</option>
                  ))}
                </select>
              </div>

              <div className={formStyles.field}>
                <label className={`${formStyles.label} ${formStyles.required}`}>Fecha:</label>
                <input type="date" className={formStyles.input} value={editFecha} onChange={e => setEditFecha(e.target.value)} />
              </div>

              <div className={formStyles.fieldRow}>
                <div className={formStyles.field}>
                  <label className={`${formStyles.label} ${formStyles.required}`}>Hora de Inicio:</label>
                  <input type="time" className={formStyles.input} value={editHoraInicio} onChange={e => setEditHoraInicio(e.target.value)} />
                </div>
                <div className={formStyles.field}>
                  <label className={`${formStyles.label} ${formStyles.required}`}>Hora de Fin:</label>
                  <input type="time" className={formStyles.input} value={editHoraFin} onChange={e => setEditHoraFin(e.target.value)} />
                </div>
              </div>

              <div className={formStyles.field}>
                <label className={`${formStyles.label} ${formStyles.required}`}>Título del Evento:</label>
                <input type="text" className={formStyles.input} value={editTitulo} onChange={e => setEditTitulo(e.target.value)} />
              </div>

              <div className={formStyles.field}>
                <label className={`${formStyles.label} ${formStyles.required}`}>Descripción del Evento:</label>
                <input type="text" className={formStyles.input} value={editDescripcion} onChange={e => setEditDescripcion(e.target.value)} />
              </div>
            </div>

            <div className={formStyles.modalActions}>
              <button className={formStyles.btnSecondary} onClick={cerrarEdicion} disabled={editLoading}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={guardarEdicion} disabled={editLoading}>
                {editLoading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <LoadingState label="Cargando reservas..." />}
      {error && <ErrorState message={error} onRetry={fetchReservas} />}

      {!loading && !error && reservas.length === 0 && (
        <EmptyState message="No hay reservas registradas." />
      )}

      {!loading && reservas.length > 0 && (
        <div className="table-container">
          <table className="styled-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Espacio</th>
                <th>Fecha</th>
                <th>Hora Inicio</th>
                <th>Hora Fin</th>
                <th>Título del Evento</th>
                <th>Descripción</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reservas.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.espacio_nombre ?? '—'}</td>
                  <td>{formatFecha(r.fecha)}</td>
                  <td>{formatHora(r.hora_inicio)}</td>
                  <td>{formatHora(r.hora_fin)}</td>
                  <td>{r.evento_titulo ?? '—'}</td>
                  <td>{r.evento_descripcion ?? '—'}</td>
                  <td>
                    <span className={`${styles.badge} ${ESTADO_BADGE_CLASS[r.estado_reserva_id] ?? ''}`}>
                      {ESTADO_LABEL[r.estado_reserva_id] ?? 'Desconocido'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.acciones}>
                      {esAdminOSacerdote && r.estado_reserva_id === 1 && (
                        <>
                          <button className={styles.btnAprobar} onClick={() => cambiarEstado(r.id, 2)}>
                            Aprobar
                          </button>
                          <button className={styles.btnRechazar} onClick={() => cambiarEstado(r.id, 3)}>
                            Rechazar
                          </button>
                        </>
                      )}
                      {usuario && (esAdminOSacerdote || r.solicitante_id === usuario.id) && (
                        <button className={styles.btnEditar} onClick={() => abrirEdicion(r)}>
                          Editar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
