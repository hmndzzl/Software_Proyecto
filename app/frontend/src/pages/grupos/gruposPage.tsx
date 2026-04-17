import { useState } from 'react';
import CrearGrupoForm from '../../modules/grupos/components/CrearGrupoForm';
import ListaGrupos from '../../modules/grupos/components/ListaGrupos';
import EditarGrupoForm from '../../modules/grupos/components/EditarGrupoForm';
import { Grupo } from '../../types';

export default function GruposPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<Grupo | null>(null);

  const handleDataChanged = () => {
    setRefreshKey(prev => prev + 1);
    setGrupoSeleccionado(null);
  };

  return (
    <div className="page-container">
      <div className="content-container">
        <div className="card">
          <h2 className="card-title">Gestión de Grupos Parroquiales</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px', marginBottom: '40px' }}>
            <CrearGrupoForm onGrupoCreado={handleDataChanged} />
            {grupoSeleccionado && (
              <EditarGrupoForm
                grupo={grupoSeleccionado}
                onGrupoActualizado={handleDataChanged}
                onCancelar={() => setGrupoSeleccionado(null)}
              />
            )}
          </div>

          <ListaGrupos refreshKey={refreshKey} onEditar={setGrupoSeleccionado} />
        </div>
      </div>
    </div>
  );
}
