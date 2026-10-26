import type { AsignadoInfo } from '../../../types';
import styles from './ResumenMinistros.module.css';

interface Props {
  asignados: AsignadoInfo[];
  tarea: string;
  onVer: () => void;
}

export default function ResumenMinistros({ asignados, tarea, onVer }: Props) {
  if (!asignados.length) return <>Sin ministro asignado</>;
  const nombres = asignados.slice(0, 2).map(ministro => ministro.nombre).join(', ');
  return <div className={styles.resumen}>
    <span className={styles.nombres} title={nombres}>{nombres}</span>
    <button type="button" className={styles.contador} onClick={onVer}
      aria-label={`${asignados.length === 1 ? 'Ver el ministro' : `Ver los ${asignados.length} ministros`} de ${tarea}`}>
      {asignados.length} {asignados.length === 1 ? 'ministro' : 'ministros'}
      <span aria-hidden="true"> · Ver {asignados.length > 2 ? 'todos' : 'detalle'}</span>
    </button>
  </div>;
}
