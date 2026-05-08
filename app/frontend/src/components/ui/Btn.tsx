import type { ReactNode, ButtonHTMLAttributes } from 'react';
import styles from './Btn.module.css';

export type BtnKind = 'primary' | 'gold' | 'ok' | 'bad' | 'ghost' | 'cream';
export type BtnSize = 'sm' | 'md' | 'lg';

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: BtnKind;
  size?: BtnSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export default function Btn({
  kind = 'primary',
  size = 'md',
  icon,
  iconRight,
  children,
  className = '',
  ...rest
}: BtnProps) {
  return (
    <button
      className={`${styles.btn} ${styles[kind]} ${styles[size]} ${className}`}
      {...rest}
    >
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {children}
      {iconRight && <span style={{ display: 'inline-flex' }}>{iconRight}</span>}
    </button>
  );
}
