import { useState } from 'react';
import ListaEventos from '../../modules/eventos/components/ListaEventos';
import EditarEventoForm from '../../modules/eventos/components/EditarEventoForm';
import { Evento } from '../../types';
import { usuarioTieneRol, ROLES } from '../../utils/roles';
import styles from './EventosPage.module.css';

export default function EventosPage() {
  const [refreshKey, setRefreshKey]                 = useState(0);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);

  const puedeEditar = usuarioTieneRol([ROLES.SACERDOTE, ROLES.ADMIN]);

  const handleDataChanged = () => {
    setRefreshKey(prev => prev + 1);
    setEventoSeleccionado(null);
  };

  return (
    <div className="page-container">
      <div className="content-container">
        <div className="card">
          <h2 className="card-title">Gestión de Eventos</h2>

          {eventoSeleccionado && (
            <div className={styles.formWrapper}>
              <EditarEventoForm
                evento={eventoSeleccionado}
                onEventoActualizado={handleDataChanged}
                onCancelar={() => setEventoSeleccionado(null)}
              />
            </div>
          )}

          <ListaEventos
            refreshKey={refreshKey}
            onEditar={puedeEditar ? setEventoSeleccionado : undefined}
          />
        </div>
      </div>
    </div>
  );
}
