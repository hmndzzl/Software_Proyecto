import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead } from '../../components/ui/Card';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import Btn from '../../components/ui/Btn';
import { ROLES, usuarioTieneRol } from '../../utils/roles';
import styles from './MinistrosPage.module.css';

interface Ministro {
  id: number;
  nombre: string;
  correo: string;
  rol_id?: number;
  disponible: boolean;
}

const ROL_LABEL: Record<number, string> = {
  1: 'Sacerdote',
  2: 'Coord. de Ministros',
  3: 'Coord. de Grupos',
  4: 'Ministro',
  5: 'Administrador',
};

function getInitials(nombre: string): string {
  return nombre.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

const puedeGestionarDisponibilidad = () => usuarioTieneRol([ROLES.COORDINADOR_MINISTROS]);

export default function MinistrosPage() {
  const [ministros, setMinistros] = useState<Ministro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [accionError, setAccionError] = useState('');
  const [actualizandoId, setActualizandoId] = useState<number | null>(null);

  const puedeGestionar = puedeGestionarDisponibilidad();

  const cargarMinistros = () => {
    setLoading(true);
    setError('');
    apiClient.get('/api/personas')
      .then(res => { setMinistros(res.data); setLoading(false); })
      .catch(() => { setError('Error al obtener ministros'); setLoading(false); });
  };

  useEffect(() => {
    cargarMinistros();
  }, []);

  const toggleDisponibilidad = async (ministro: Ministro) => {
    const nuevoValor = !ministro.disponible;
    setAccionError('');
    setActualizandoId(ministro.id);
    try {
      await apiClient.patch(`/api/personas/${ministro.id}/disponibilidad`, { disponible: nuevoValor });
      setMinistros(prev => prev.map(m => (m.id === ministro.id ? { ...m, disponible: nuevoValor } : m)));
    } catch {
      setAccionError('No se pudo actualizar la disponibilidad. Intenta de nuevo.');
    } finally {
      setActualizandoId(null);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Directorio"
        title="Ministros y Personas"
        subtitle="Directorio de ministros y voluntarios de la parroquia."
      />

      <Card>
        <CardHead
          title="Directorio"
          hint={!loading ? `${ministros.length} personas` : undefined}
        />

        {loading && <LoadingState label="Cargando ministros..." />}
        {error   && <ErrorState message={error} onRetry={cargarMinistros} />}
        {!loading && !error && accionError && (
          <p className={`${styles.msg} ${styles.msgError}`}>{accionError}</p>
        )}

        {!loading && !error && ministros.length === 0 && (
          <EmptyState message="No hay ministros registrados." />
        )}

        {!loading && !error && ministros.length > 0 && (
          <div className="table-container">
            <table className="styled-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Disponibilidad</th>
                </tr>
              </thead>
              <tbody>
                {ministros.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div className={styles.nameCell}>
                        <div className={styles.avatar}>{getInitials(m.nombre)}</div>
                        <span className={styles.nombre}>{m.nombre}</span>
                      </div>
                    </td>
                    <td className={styles.correo}>{m.correo}</td>
                    <td>
                      <span className={styles.rolBadge}>
                        {ROL_LABEL[m.rol_id ?? 4] ?? 'Ministro'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.dispoCell}>
                        <Badge kind={m.disponible ? 'confirmada' : 'bad'}>
                          {m.disponible ? 'Disponible' : 'No disponible'}
                        </Badge>
                        {puedeGestionar && (
                          <Btn
                            kind="ghost"
                            size="sm"
                            disabled={actualizandoId === m.id}
                            onClick={() => toggleDisponibilidad(m)}
                          >
                            {m.disponible ? 'Marcar no disponible' : 'Marcar disponible'}
                          </Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
