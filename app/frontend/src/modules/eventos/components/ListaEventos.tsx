import { useEffect, useState } from 'react';
import { Evento } from '../../../types';
import { usuarioTieneRol, ROLES } from '../../../utils/roles';
import apiClient from '../../../api/client';
import styles from './ListaEventos.module.css';

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
      <h3 className={styles.seccionTitulo}>Lista de Eventos</h3>

      {loading && <p className={styles.textoInfo}>Cargando eventos...</p>}
      {error   && <p className="error-text">{error}</p>}

      {!loading && !error && eventos.length === 0 && (
        <p className={styles.textoVacio}>No hay eventos registrados.</p>
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
                        <button className={styles.btnEditar} onClick={() => onEditar(ev)}>
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
