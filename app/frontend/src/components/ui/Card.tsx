import type { ReactNode, CSSProperties } from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Card({ children, className = '', style }: CardProps) {
  return (
    <div className={`${styles.card} ${className}`} style={style}>
      {children}
    </div>
  );
}

interface CardHeadProps {
  title: string;
  hint?: string;
  right?: ReactNode;
}

export function CardHead({ title, hint, right }: CardHeadProps) {
  return (
    <div className={styles.head}>
      <div className={styles.headLeft}>
        <div className={styles.headBar} />
        <h3 className={styles.headTitle}>{title}</h3>
        {hint && <span className={styles.headHint}>{hint}</span>}
      </div>
      {right && <div className={styles.headRight}>{right}</div>}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.body} ${className}`}>{children}</div>;
}
