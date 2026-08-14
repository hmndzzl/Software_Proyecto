import Spinner, { type SpinnerSize } from './Spinner';
import styles from './LoadingState.module.css';

interface LoadingStateProps {
  label?: string;
  size?: SpinnerSize;
}

/** Bloque de carga estándar para reemplazar los <p>Cargando...</p> ad-hoc */
export default function LoadingState({ label = 'Cargando...', size = 'md' }: LoadingStateProps) {
  return (
    <div className={styles.wrap}>
      <Spinner size={size} label={label} />
    </div>
  );
}
