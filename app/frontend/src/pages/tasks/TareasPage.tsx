import { useState } from 'react';
import ListaAsignaciones from '../../modules/tareas/components/ListaAsignaciones';
import CrearTareaForm from '../../modules/tareas/components/CrearTareaForm';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead, CardBody } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { ROLES, rolTieneAcceso } from '../../utils/roles';
import styles from './TareasPage.module.css';

export default function TareasPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { usuario } = useAuth();
  const puedeGestionar = rolTieneAcceso(usuario?.rol_id, [ROLES.COORDINADOR_MINISTROS]);

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Asignaciones"
        title="Gestión de Tareas"
        subtitle="Crea, asigna y supervisa las tareas del ministerio parroquial."
      />

      {puedeGestionar && (
        <Card>
          <CardHead title="Crear y asignar tarea" />
          <CardBody>
            <CrearTareaForm refreshKey={refreshKey} onTareaCreada={() => setRefreshKey(k => k + 1)} />
          </CardBody>
        </Card>
      )}

      <Card>
        <ListaAsignaciones refreshKey={refreshKey} onCambio={() => setRefreshKey(k => k + 1)} />
      </Card>
    </div>
  );
}
