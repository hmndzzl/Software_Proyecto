import Spinner, { type SpinnerSize } from './Spinner';
import styles from './LoadingState.module.css';

interface LoadingStateProps {
  label?: string;
  size?: SpinnerSize;
  variant?: 'spinner' | 'table' | 'cards' | 'detail' | 'list' | 'metric';
}

const line = (className = '') => <span className={`${styles.bone} ${className}`} />;

export default function LoadingState({ label = 'Cargando...', size = 'md', variant = 'spinner' }: LoadingStateProps) {
  if (variant === 'spinner') return <div className={styles.wrap}><Spinner size={size} label={label} /></div>;

  return (
    <div className={styles[variant]} role="status" aria-label={label} data-skeleton={variant}>
      <span className={styles.srOnly}>{label}</span>
      <div className={styles.visual} aria-hidden="true">
        {variant === 'metric' && line(styles.number)}
        {variant === 'list' && [0, 1, 2].map(i => <div className={styles.listRow} key={i}>{line(styles.icon)}<div className={styles.lines}>{line(styles.long)}{line(styles.short)}</div></div>)}
        {variant === 'table' && <div className={styles.tableBody}>
          <div className={styles.tableHeader}>{[0, 1, 2, 3].map(i => <span className={styles.bone} key={i} />)}</div>
          {[0, 1, 2, 3].map(i => <div className={styles.tableRow} key={i}>{[0, 1, 2, 3].map(j => <span className={styles.bone} key={j} />)}</div>)}
        </div>}
        {variant === 'cards' && <div className={styles.cardsGrid}>{[0, 1, 2].map(i => <div className={styles.card} key={i}>{line(styles.photo)}<div className={styles.cardBody}>{line(styles.long)}{line(styles.short)}{line(styles.medium)}</div></div>)}</div>}
        {variant === 'detail' && <>{line(styles.breadcrumb)}<div className={styles.detailGrid}><div className={styles.detailLeft}>{line(styles.detailPhoto)}{line(styles.short)}{line(styles.heading)}{line(styles.long)}{line(styles.medium)}</div><div className={styles.panel}>{line(styles.medium)}{[0, 1, 2].map(i => <div className={styles.panelRow} key={i}>{line(styles.long)}{line(styles.short)}</div>)}</div></div></>}
      </div>
    </div>
  );
}
