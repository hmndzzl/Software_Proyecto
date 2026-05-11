import { useState } from 'react';
import ListaAsignaciones from '../../modules/tareas/components/ListaAsignaciones';
import AsignarTareaForm from '../../modules/tareas/components/AsignarTareaForm';
import CrearTareaForm from '../../modules/tareas/components/CrearTareaForm';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead, CardBody } from '../../components/ui/Card';
import styles from './TareasPage.module.css';

export default function TareasPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const esMinistro = usuario?.rol_id === 4;

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Asignaciones"
        title="Gestión de Tareas"
        subtitle="Crea, asigna y supervisa las tareas del ministerio parroquial."
      />

      {!esMinistro && (
        <div className={styles.formsGrid}>
          <Card>
            <CardHead title="Crear Nueva Tarea" />
            <CardBody>
              <CrearTareaForm onTareaCreada={() => setRefreshKey(k => k + 1)} />
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Asignar Tarea a Ministro" />
            <CardBody>
              <AsignarTareaForm refreshKey={refreshKey} onAsignacionExitosa={() => setRefreshKey(k => k + 1)} />
            </CardBody>
          </Card>
        </div>
      )}

      <Card>
        <ListaAsignaciones refreshKey={refreshKey} />
      </Card>
    </div>
  );
}
