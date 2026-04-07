import ListaAsignaciones from '../../modules/tareas/components/ListaAsignaciones';
import AsignarTareaForm from '../../modules/tareas/components/AsignarTareaForm';

export default function TareasPage() {
  return (
    <div className="page-container">
      <div className="content-container">
        <div className="card">
          <h2 className="card-title">Gestión de Tareas</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <AsignarTareaForm />
            <ListaAsignaciones />
          </div>
        </div>
      </div>
    </div>
  );
}
