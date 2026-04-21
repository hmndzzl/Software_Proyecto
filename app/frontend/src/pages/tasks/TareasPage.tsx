import { useState } from 'react';
import ListaAsignaciones from '../../modules/tareas/components/ListaAsignaciones';
import AsignarTareaForm from '../../modules/tareas/components/AsignarTareaForm';
import CrearTareaForm from '../../modules/tareas/components/CrearTareaForm';

export default function TareasPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDataChanged = () => {
    setRefreshKey(prev => prev + 1);
  };

  const usuarioGuardado = localStorage.getItem('usuario');
  const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
  const esMinistro = usuario?.rol_id === 4;

  return (
    <div className="page-container">
      <div className="content-container">
        <div className="card">
          <h2 className="card-title">Gestión de Tareas</h2>
          
          {!esMinistro && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px', marginBottom: '40px' }}>
              <CrearTareaForm onTareaCreada={handleDataChanged} />
              <AsignarTareaForm refreshKey={refreshKey} onAsignacionExitosa={handleDataChanged} />
            </div>
          )}
          
          <ListaAsignaciones refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}