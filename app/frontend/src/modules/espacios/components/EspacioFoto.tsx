import { useState } from 'react';
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
        <img className={styles.foto} src={urlValida} alt={`Fotografía de ${nombre}`}
          loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setUrlFallida(urlValida)} />
      ) : (
        <>[ foto · {nombre.toLowerCase()} ]</>
      )}
    </div>
  );
}
