import { useState } from 'react';
import ImagenAmpliable from '../../../components/ui/ImagenAmpliable';
import styles from './EspacioFoto.module.css';

interface Props {
  nombre: string;
  fotoUrl?: string | null;
  className: string;
  eager?: boolean;
}

export default function EspacioFoto({ nombre, fotoUrl, className, eager = false }: Props) {
  const [urlFallida, setUrlFallida] = useState<string | null>(null);
  const urlValida = fotoUrl && /^\/uploads\/espacios\/(?:subidas\/)?[a-z0-9-]+\.webp$/.test(fotoUrl) ? fotoUrl : null;

  return (
    <div className={className}>
      {urlValida && urlFallida !== urlValida ? (
        <ImagenAmpliable className={styles.foto} src={urlValida} alt={`Fotografía de ${nombre}`}
          loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setUrlFallida(urlValida)} />
      ) : (
        <div className={styles.placeholder}>
          <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8" cy="8" r="1.5" /><path d="m21 15-5-5L5 21" />
          </svg>
          <span>Fotografía no disponible</span>
        </div>
      )}
    </div>
  );
}
