// Compatibilidad para consumidores anteriores: ambos flujos usan el formulario unificado.
import CrearTareaForm from './CrearTareaForm';

export default function AsignarTareaForm({ refreshKey, onAsignacionExitosa }: { refreshKey?: number; onAsignacionExitosa?: () => void }) {
  return <CrearTareaForm refreshKey={refreshKey} onTareaCreada={onAsignacionExitosa} />;
}
