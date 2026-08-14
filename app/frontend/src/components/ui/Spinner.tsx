import styles from './Spinner.module.css';

export type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
  label?: string;
  /** Si true, cubre toda la pantalla con un fondo semitransparente */
  fullPage?: boolean;
}

const SIZE_PX: Record<SpinnerSize, number> = { sm: 20, md: 36, lg: 52 };

export default function Spinner({ size = 'md', label, fullPage = false }: SpinnerProps) {
  const px = SIZE_PX[size];

  const svgEl = (
    <svg
      className={`${styles.svg} ${styles[size]}`}
      viewBox="0 0 50 50"
      width={px}
      height={px}
      aria-hidden="true"
      role="presentation"
    >
      {/* Pista de fondo */}
      <circle
        cx="25" cy="25" r="20"
        fill="none"
        stroke="var(--color-line)"
        strokeWidth="5"
      />
      {/* Arco animado */}
      <circle
        cx="25" cy="25" r="20"
        fill="none"
        stroke="var(--color-rojo)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="80 200"
      />
    </svg>
  );

  if (fullPage) {
    return (
      <div className={styles.fullPage} role="status" aria-label={label ?? 'Cargando...'}>
        {svgEl}
        <span className={styles.label}>{label ?? 'Cargando...'}</span>
      </div>
    );
  }

  return (
    <div className={styles.wrapper} role="status" aria-label={label ?? 'Cargando...'}>
      {svgEl}
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}
