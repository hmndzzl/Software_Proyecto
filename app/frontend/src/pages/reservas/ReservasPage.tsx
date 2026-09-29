import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CrearReservaForm from '../../modules/reservas/components/CrearReservaForm';
import ListaReservas from '../../modules/reservas/components/ListaReservas';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead, CardBody } from '../../components/ui/Card';
import styles from './ReservasPage.module.css';

export default function ReservasPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  // Llegada desde "Nueva reserva" (Sidebar / Mis Reservas): se enfoca el formulario.
  const [searchParams] = useSearchParams();
  const enfocarFormulario = searchParams.get('nueva') === '1';

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
          <CrearReservaForm
            autoFocus={enfocarFormulario}
            onReservaCreada={() => setRefreshKey(k => k + 1)}
          />
        </CardBody>
      </Card>

      <Card>
        <ListaReservas refreshKey={refreshKey} />
      </Card>
    </div>
  );
}
