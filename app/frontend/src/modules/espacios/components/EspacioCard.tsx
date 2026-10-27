import styles from './EspacioCard.module.css';
import Badge from '../../../components/ui/Badge';
import EspacioFoto from './EspacioFoto';
import EspacioGestion from './EspacioGestion';

export interface ReservaCheckinDisponible {
  id: number;
  hora_inicio: string;
  hora_fin: string;
  solicitante_id: number;
  solicitante_nombre: string;
  checkin_en: string | null;
}

export interface Espacio {
  id: number;
  nombre: string;
  capacidad: number | null;
  foto_url?: string | null;
  consultado_en?: string;
  disponible?: boolean | 0 | 1;
  en_uso?: boolean | 0 | 1;
  reservas_checkin_disponible?: ReservaCheckinDisponible[];
}

interface EspacioCardProps {
  espacio: Espacio;
  onChanged: () => void;
  onClick: (id: number) => void;
}

export default function EspacioCard({ espacio, onClick, onChanged }: EspacioCardProps) {
  const consultado = espacio.disponible === true || espacio.disponible === false || espacio.disponible === 0 || espacio.disponible === 1;
  const estaOcupado = espacio.disponible === false || espacio.disponible === 0;
  const enUso = espacio.en_uso === true || espacio.en_uso === 1;

  return (
    <article className={styles.card} aria-label={espacio.nombre} onClick={() => onClick(espacio.id)}>

      <EspacioFoto className={styles.photoSlot} nombre={espacio.nombre} fotoUrl={espacio.foto_url} />

      <div className={styles.body}>
        <h3 className={styles.nombre}>{espacio.nombre}</h3>

        <div className={styles.metadata}>
          <Badge kind={consultado ? estaOcupado ? 'bad' : 'ok' : 'neutral'}>
            {consultado ? estaOcupado ? 'Ocupado' : 'Disponible' : 'Sin consultar'}
          </Badge>
          {enUso && consultado && <Badge kind="bad">En uso ahora</Badge>}
          <span className={styles.capacidad}>
            <span className={styles.capacidadIcon} aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </span>
            {espacio.capacidad != null ? `${espacio.capacidad} personas` : 'Capacidad sin definir'}
          </span>
        </div>
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.detalle} onClick={event => { event.stopPropagation(); onClick(espacio.id); }}>
          Ver detalle
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
        <EspacioGestion espacio={espacio} onChanged={onChanged} compact />
      </div>
    </article>
  );
}
