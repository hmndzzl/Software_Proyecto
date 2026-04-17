import styles from './EspacioCard.module.css';

export interface Espacio {
  id: number;
  nombre: string;
  capacidad: number | null;
  // imagen_url?: string;  — disponible en futuras implementaciones
}

interface EspacioCardProps {
  espacio: Espacio;
  onClick: (id: number) => void;
}

export default function EspacioCard({ espacio, onClick }: EspacioCardProps) {
  return (
    <div className={styles.card} onClick={() => onClick(espacio.id)}>

      {/* Área de imagen — preparada para sprint futuro */}
      <div className={styles.banner}>🏛️</div>

      <div className={styles.body}>
        <h3 className={styles.nombre}>{espacio.nombre}</h3>

        <div className={styles.capacidad}>
          <span>👥</span>
          <span>
            {espacio.capacidad != null
              ? `${espacio.capacidad} personas`
              : 'Capacidad no definida'}
          </span>
        </div>

        <div className={styles.footer}>
          <span className={styles.verDetalle}>Ver detalle →</span>
        </div>
      </div>

    </div>
  );
}
