import { useState } from 'react';
import ListaEventos from '../../modules/eventos/components/ListaEventos';
import EditarEventoForm from '../../modules/eventos/components/EditarEventoForm';
import { Evento } from '../../types';
import { usuarioTieneRol, ROLES } from '../../utils/roles';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead, CardBody } from '../../components/ui/Card';
import styles from './EventosPage.module.css';

export default function EventosPage() {
  const [refreshKey, setRefreshKey]                 = useState(0);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);

  const puedeEditar = usuarioTieneRol([ROLES.SACERDOTE, ROLES.ADMIN]);

  const handleChanged = () => {
    setRefreshKey(k => k + 1);
    setEventoSeleccionado(null);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Calendario Pastoral"
        title="Gestión de Eventos"
        subtitle="Calendario completo de eventos y actividades litúrgicas de la parroquia."
      />

      {eventoSeleccionado && (
        <Card>
          <CardHead title="Editar Evento" />
          <CardBody>
            <EditarEventoForm
              evento={eventoSeleccionado}
              onEventoActualizado={handleChanged}
              onCancelar={() => setEventoSeleccionado(null)}
            />
          </CardBody>
        </Card>
      )}

      <Card>
        <ListaEventos
          refreshKey={refreshKey}
          onEditar={puedeEditar ? setEventoSeleccionado : undefined}
        />
      </Card>
    </div>
  );
}
