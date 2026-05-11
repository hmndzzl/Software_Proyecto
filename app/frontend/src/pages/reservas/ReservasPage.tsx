import { useState } from 'react';
import CrearReservaForm from '../../modules/reservas/components/CrearReservaForm';
import ListaReservas from '../../modules/reservas/components/ListaReservas';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead, CardBody } from '../../components/ui/Card';
import styles from './ReservasPage.module.css';

export default function ReservasPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Gestión de Espacios"
        title="Reservas"
        subtitle="Solicita y administra el uso de los espacios parroquiales."
      />

      <Card>
        <CardHead title="Nueva Solicitud" />
        <CardBody>
          <CrearReservaForm onReservaCreada={() => setRefreshKey(k => k + 1)} />
        </CardBody>
      </Card>

      <Card>
        <ListaReservas refreshKey={refreshKey} />
      </Card>
    </div>
  );
}
