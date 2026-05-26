import styles from './EspacioCard.module.css';
import Badge from '../../../components/ui/Badge';

export interface Espacio {
  id: number;
  nombre: string;
  capacidad: number | null;
  disponible?: boolean | 0 | 1;
}

interface EspacioCardProps {
  espacio: Espacio;
  onClick: (id: number) => void;
}

export default function EspacioCard({ espacio, onClick }: EspacioCardProps) {
  const estaOcupado = espacio.disponible === false || espacio.disponible === 0;

  return (
    <div className={styles.card} onClick={() => onClick(espacio.id)}>

      <div className={styles.photoSlot}>
        [ foto · {espacio.nombre.toLowerCase()} ]
      </div>

      <div className={styles.body}>
        <p className={styles.tipo}>Espacio parroquial</p>
        <h3 className={styles.nombre}>{espacio.nombre}</h3>

        <div className={styles.badgeWrap}>
          <Badge kind={estaOcupado ? 'bad' : 'ok'}>
            {estaOcupado ? 'Ocupado' : 'Disponible'}
          </Badge>
        </div>

        {espacio.capacidad != null && (
          <div className={styles.capacidad}>
            <span className={styles.capacidadIcon}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </span>
            {espacio.capacidad} personas
          </div>
        )}
      </div>

      <button className={styles.btnDetalle} onClick={() => onClick(espacio.id)}>
        Ver Detalle
      </button>
    </div>
  );
}
