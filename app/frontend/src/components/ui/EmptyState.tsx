import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  message: string;
  icon?: ReactNode;
}

/** Bloque de estado vacío estándar para reemplazar los <p>No hay X registrados.</p> ad-hoc */
export default function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <p className={styles.message}>{message}</p>
    </div>
  );
}
