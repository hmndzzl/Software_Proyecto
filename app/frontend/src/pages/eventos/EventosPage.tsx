import { useState } from 'react';
import Btn from '../../components/ui/Btn';
import Modal from '../../components/ui/Modal';
import CrearReservaForm from '../../modules/reservas/components/CrearReservaForm';
import ListaEventos from '../../modules/eventos/components/ListaEventos';
import EditarEventoForm from '../../modules/eventos/components/EditarEventoForm';
import { Evento } from '../../types';
import { ROLES } from '../../utils/roles';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardHead, CardBody } from '../../components/ui/Card';
import styles from './EventosPage.module.css';

export default function EventosPage() {
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [refreshKey, setRefreshKey]                 = useState(0);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);

  const { tieneRol } = useAuth();
  const puedeEditar = tieneRol([ROLES.SACERDOTE, ROLES.ADMIN]);
  const puedeCrear = tieneRol([ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS]);

  const handleChanged = () => {
    setRefreshKey(k => k + 1);
    setEventoSeleccionado(null);
    setCreando(false);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Calendario Pastoral"
        title="Gestión de Eventos"
        subtitle="Calendario completo de eventos y actividades litúrgicas de la parroquia."
        actions={puedeCrear ? <Btn onClick={() => { setEventoSeleccionado(null); setCreando(true); }}>Nuevo evento</Btn> : undefined}
      />

      {creando && <Modal open title="Crear evento" width={720} closeDisabled={guardando}
        onClose={() => setCreando(false)} initialFocusSelector="#espacio_id">
        <CrearReservaForm contexto="evento" onReservaCreada={handleChanged} onGuardandoChange={setGuardando} />
      </Modal>}

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
