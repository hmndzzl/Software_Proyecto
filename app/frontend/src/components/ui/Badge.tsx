import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeKind = 'pendiente' | 'confirmada' | 'rechazada' | 'cancelada' | 'info' | 'neutral' | 'ok' | 'bad';

interface BadgeProps {
  kind: BadgeKind;
  children: ReactNode;
  title?: string;
}

export default function Badge({ kind, children, title }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[kind]}`} title={title}>
      <span className={styles.dot} />
      {children}
    </span>
  );
}
