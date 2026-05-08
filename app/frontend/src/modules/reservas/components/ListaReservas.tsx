import { useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import styles from '../../../styles/Form.module.css';

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

const ESTADO_COLOR: Record<number, string> = {
  1: '#b45309',
  2: '#2e7d32',
  3: '#c0392b'
};

const ESTADO_BG: Record<number, string> = {
  1: '#fef9c3',
  2: '#dcfce7',
  3: '#fde8e8'
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
      <h3 style={{ marginBottom: '16px' }}>Lista de Reservas</h3>

      {editando && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h4 className={styles.modalTitle}>Editar Reserva #{editando.id}</h4>

            {editando.estado_reserva_id !== 1 && (
              <div className={styles.modalWarning}>
                Esta reserva volverá a estado <strong>Pendiente</strong> para re-aprobación.
              </div>
            )}

            {editMensaje && (
              <p className={`${styles.message} ${styles.messageError}`}>{editMensaje}</p>
            )}

            <div className={styles.form}>
              <div className={styles.field}>
                <label className={`${styles.label} ${styles.required}`}>Espacio:</label>
                <select className={styles.input} value={editEspacioId} onChange={e => setEditEspacioId(e.target.value)}>
                  <option value="">-- Selecciona un espacio --</option>
                  {espacios.map(esp => (
                    <option key={esp.id} value={esp.id}>{esp.nombre}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={`${styles.label} ${styles.required}`}>Fecha:</label>
                <input type="date" className={styles.input} value={editFecha} onChange={e => setEditFecha(e.target.value)} />
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={`${styles.label} ${styles.required}`}>Hora de Inicio:</label>
                  <input type="time" className={styles.input} value={editHoraInicio} onChange={e => setEditHoraInicio(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label className={`${styles.label} ${styles.required}`}>Hora de Fin:</label>
                  <input type="time" className={styles.input} value={editHoraFin} onChange={e => setEditHoraFin(e.target.value)} />
                </div>
              </div>

              <div className={styles.field}>
                <label className={`${styles.label} ${styles.required}`}>Título del Evento:</label>
                <input type="text" className={styles.input} value={editTitulo} onChange={e => setEditTitulo(e.target.value)} />
              </div>

              <div className={styles.field}>
                <label className={`${styles.label} ${styles.required}`}>Descripción del Evento:</label>
                <input type="text" className={styles.input} value={editDescripcion} onChange={e => setEditDescripcion(e.target.value)} />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={cerrarEdicion} disabled={editLoading}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={guardarEdicion} disabled={editLoading}>
                {editLoading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <p style={{ color: '#555', fontSize: '14px' }}>Cargando reservas...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && reservas.length === 0 && (
        <p style={{ color: '#777', fontSize: '14px' }}>No hay reservas registradas.</p>
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
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '50px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: ESTADO_COLOR[r.estado_reserva_id] ?? '#333',
                      backgroundColor: ESTADO_BG[r.estado_reserva_id] ?? '#f0f0f0'
                    }}>
                      {ESTADO_LABEL[r.estado_reserva_id] ?? 'Desconocido'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {esAdminOSacerdote && r.estado_reserva_id === 1 && (
                        <>
                          <button
                            onClick={() => cambiarEstado(r.id, 2)}
                            style={{ padding: '4px 8px', backgroundColor: '#2e7d32', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => cambiarEstado(r.id, 3)}
                            style={{ padding: '4px 8px', backgroundColor: '#c0392b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            Rechazar
                          </button>
                        </>
                      )}
                      {usuario && (esAdminOSacerdote || r.solicitante_id === usuario.id) && (
                        <button
                          onClick={() => abrirEdicion(r)}
                          style={{ padding: '4px 8px', backgroundColor: '#1565c0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
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
