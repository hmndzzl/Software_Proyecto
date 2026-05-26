import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeKind = 'pendiente' | 'confirmada' | 'rechazada' | 'info' | 'neutral' | 'ok' | 'bad';

interface BadgeProps {
  kind: BadgeKind;
  children: ReactNode;
}

export default function Badge({ kind, children }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[kind]}`}>
      <span className={styles.dot} />
      {children}
    </span>
  );
}
