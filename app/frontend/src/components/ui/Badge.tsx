import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeKind = 'pendiente' | 'confirmada' | 'rechazada' | 'cancelada' | 'info' | 'neutral' | 'ok' | 'bad';

interface BadgeProps {
  kind: BadgeKind;
  children: ReactNode;
  title?: string;
  className?: string;
}

export default function Badge({ kind, children, title, className }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[kind]}${className ? ` ${className}` : ''}`} title={title}>
      {children}
    </span>
  );
}
