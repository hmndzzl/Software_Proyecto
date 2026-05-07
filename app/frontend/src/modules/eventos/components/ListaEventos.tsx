import { useEffect, useState } from 'react';
import { Evento } from '../../../types';
import { usuarioTieneRol, ROLES } from '../../../utils/roles';
import apiClient from '../../../api/client';

const fmt  = (f: string) => { const [y,m,d] = f.split('T')[0].split('-'); return `${d}/${m}/${y}`; };
const fmtH = (h: string) => h.substring(0, 5);

export default function ListaEventos({
  refreshKey,
  onEditar,
}: {
  refreshKey?: number;
  onEditar?: (evento: Evento) => void;
}) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const puedeEditar = usuarioTieneRol([ROLES.SACERDOTE, ROLES.ADMIN]);

  useEffect(() => {
    const fetchEventos = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiClient.get('/api/eventos');
        setEventos(res.data);
      } catch {
        setError('Error de red al obtener los eventos.');
      } finally {
        setLoading(false);
      }
    };
    fetchEventos();
  }, [refreshKey]);

  return (
    <div>
      <h3 style={{ marginBottom: '16px' }}>Lista de Eventos</h3>

      {loading && <p style={{ color: '#555', fontSize: '14px' }}>Cargando eventos...</p>}
      {error   && <p className="error-text">{error}</p>}

      {!loading && !error && eventos.length === 0 && (
        <p style={{ color: '#777', fontSize: '14px' }}>No hay eventos registrados.</p>
      )}

      {!loading && eventos.length > 0 && (
        <div className="table-container">
          <table className="styled-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Descripción</th>
                <th>Encargado</th>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Espacio</th>
                {puedeEditar && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {eventos.map(ev => (
                <tr key={ev.id}>
                  <td>{ev.id}</td>
                  <td>{ev.descripcion}</td>
                  <td>{ev.nombre_encargado}</td>
                  <td>{fmt(ev.fecha)}</td>
                  <td>{fmtH(ev.hora_inicio)}–{fmtH(ev.hora_fin)}</td>
                  <td>{ev.nombre_espacio ?? '—'}</td>
                  {puedeEditar && (
                    <td>
                      {onEditar && (
                        <button
                          onClick={() => onEditar(ev)}
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid #ccc',
                            borderRadius: '50px',
                            padding: '6px 14px',
                            fontWeight: 600,
                            fontSize: '12px',
                            cursor: 'pointer',
                            color: '#333',
                          }}
                        >
                          Editar
                        </button>
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
