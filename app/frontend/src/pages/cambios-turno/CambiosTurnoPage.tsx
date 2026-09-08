import { useState } from 'react';
import SolicitarCambioTurnoForm from '../../modules/cambioTurno/components/SolicitarCambioTurnoForm';
import ListaCambiosTurno from '../../modules/cambioTurno/components/ListaCambiosTurno';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead, CardBody } from '../../components/ui/Card';
import styles from './CambiosTurnoPage.module.css';

export default function CambiosTurnoPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Ministerio"
        title="Cambio de Turno entre Ministros"
        subtitle="Solicita que otro ministro tome tu lugar en una tarea, o responde a una solicitud que recibiste. Al aceptar, el titular de la tarea se actualiza automáticamente."
      />

      <Card>
        <CardHead title="Nueva Solicitud" />
        <CardBody>
          <SolicitarCambioTurnoForm onSolicitudEnviada={() => setRefreshKey(k => k + 1)} />
        </CardBody>
      </Card>

      <Card>
        <ListaCambiosTurno refreshKey={refreshKey} />
      </Card>
    </div>
  );
}
