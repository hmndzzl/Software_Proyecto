import { useState } from 'react';
import CrearEventoForm from '../../modules/eventos/components/CrearEventoForm';
import ListaEventos from '../../modules/eventos/components/ListaEventos';
import EditarEventoForm from '../../modules/eventos/components/EditarEventoForm';
import { Evento } from '../../types';
import { usuarioTieneRol, ROLES } from '../../utils/roles';

export default function EventosPage() {
  const [refreshKey, setRefreshKey]             = useState(0);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);

  const puedeCrear = usuarioTieneRol([ROLES.SACERDOTE, ROLES.ADMIN]);

  const handleDataChanged = () => {
    setRefreshKey(prev => prev + 1);
    setEventoSeleccionado(null);
  };

  return (
    <div className="page-container">
      <div className="content-container">
        <div className="card">
          <h2 className="card-title">Gestión de Eventos</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px', marginBottom: '40px' }}>
            {puedeCrear && <CrearEventoForm onEventoCreado={handleDataChanged} />}
            {eventoSeleccionado && (
              <EditarEventoForm
                evento={eventoSeleccionado}
                onEventoActualizado={handleDataChanged}
                onCancelar={() => setEventoSeleccionado(null)}
              />
            )}
          </div>

          <ListaEventos refreshKey={refreshKey} onEditar={puedeCrear ? setEventoSeleccionado : undefined} />
        </div>
      </div>
    </div>
  );
}
