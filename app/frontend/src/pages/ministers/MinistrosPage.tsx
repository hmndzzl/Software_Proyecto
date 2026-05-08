import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead } from '../../components/ui/Card';
import styles from './MinistrosPage.module.css';

interface Ministro {
  id: number;
  nombre: string;
  correo: string;
  rol_id?: number;
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

export default function MinistrosPage() {
  const [ministros, setMinistros] = useState<Ministro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    apiClient.get('/api/personas')
      .then(res => { setMinistros(res.data); setLoading(false); })
      .catch(() => { setError('Error al obtener ministros'); setLoading(false); });
  }, []);

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

        {loading && <p className={styles.msg}>Cargando ministros...</p>}
        {error   && <p className={`${styles.msg} ${styles.msgError}`}>{error}</p>}

        {!loading && !error && ministros.length === 0 && (
          <p className={styles.msg}>No hay ministros registrados.</p>
        )}

        {!loading && !error && ministros.length > 0 && (
          <div className="table-container">
            <table className="styled-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
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
