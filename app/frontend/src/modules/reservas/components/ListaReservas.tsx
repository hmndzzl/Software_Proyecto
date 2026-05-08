import { useEffect, useState } from 'react';
import apiClient from '../../../api/client';

interface Reserva {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  espacio_nombre: string | null;
  estado_reserva_id: number;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Obtener usuario del localStorage para verificar permisos
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
  }, [refreshKey]);

  const cambiarEstado = async (id: number, nuevoEstado: number) => {
    try {
      await apiClient.put(`/api/reservas/${id}/estado`, { estado_id: nuevoEstado });
      // Recargar la lista tras el cambio
      fetchReservas();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al cambiar el estado de la reserva');
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
                {esAdminOSacerdote && <th>Acciones</th>}
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
                  {esAdminOSacerdote && (
                    <td>
                      {r.estado_reserva_id === 1 && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => cambiarEstado(r.id, 2)}
                            style={{ 
                              padding: '4px 8px', 
                              backgroundColor: '#2e7d32', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '4px', 
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Aprobar
                          </button>
                          <button 
                            onClick={() => cambiarEstado(r.id, 3)}
                            style={{ 
                              padding: '4px 8px', 
                              backgroundColor: '#c0392b', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '4px', 
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Rechazar
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
