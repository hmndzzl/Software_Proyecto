import { useId, useRef, useState } from 'react';
import Btn from '../../components/ui/Btn';
import { subirImagenLanding } from '../../api/landing';
import { getApiErrorMessage } from '../../utils/apiError';
import styles from './SelectorImagen.module.css';

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

interface SelectorImagenProps {
  etiqueta: string;
  /** URL de la foto subida desde el panel; vacía o ausente cuando no hay foto propia. */
  valor?: string;
  /** Foto que trae el sitio y se muestra mientras no se suba otra. */
  predeterminada?: string;
  alCambiar: (url: string) => void;
}

/** Sube la foto al elegirla y entrega su URL; el contenido se publica con «Guardar y publicar cambios». */
export default function SelectorImagen({ etiqueta, valor, predeterminada, alCambiar }: SelectorImagenProps) {
  const id = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const mostrada = valor || predeterminada;

  const seleccionar = async (archivo: File | null) => {
    if (!archivo) return;
    if (!TIPOS_PERMITIDOS.includes(archivo.type)) { setError('Elige una imagen JPEG, PNG o WebP.'); return; }
    if (archivo.size > MAX_BYTES) { setError('La imagen no puede superar 10 MB.'); return; }
    setError('');
    setSubiendo(true);
    try {
      alCambiar(await subirImagenLanding(archivo));
    } catch (errorSubida) {
      setError(getApiErrorMessage(errorSubida, 'No se pudo subir la foto. Intenta de nuevo.', 'message'));
    } finally {
      setSubiendo(false);
      if (entrada.current) entrada.current.value = '';
    }
  };

  const estado = valor
    ? 'Foto nueva: se publicará al guardar los cambios.'
    : predeterminada ? 'Se usa la foto predeterminada del sitio.' : 'Sin foto: se muestra un espacio reservado.';

  return (
    <div className={styles.root}>
      <div className={styles.preview}>
        {mostrada
          ? <img src={mostrada} alt={`Vista previa: ${etiqueta}`} />
          : <span className={styles.vacio}>Sin foto</span>}
      </div>
      <div className={styles.info}>
        <p className={styles.label} id={`${id}-etiqueta`}>{etiqueta}</p>
        <p className={styles.estado} aria-live="polite">{subiendo ? 'Subiendo foto…' : estado}</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <input ref={entrada} id={id} className={styles.archivo} type="file" accept={TIPOS_PERMITIDOS.join(',')} tabIndex={-1}
          aria-labelledby={`${id}-etiqueta`} disabled={subiendo} onChange={(event) => void seleccionar(event.target.files?.[0] ?? null)} />
        <div className={styles.acciones}>
          <Btn type="button" kind="ghost" size="sm" disabled={subiendo} aria-label={`${valor ? 'Cambiar' : 'Subir'} foto: ${etiqueta}`}
            onClick={() => entrada.current?.click()}>
            {valor ? 'Cambiar foto' : 'Subir foto'}
          </Btn>
          {valor && (
            <Btn type="button" kind="bad" size="sm" disabled={subiendo} aria-label={`Quitar foto: ${etiqueta}`}
              onClick={() => { setError(''); alCambiar(''); }}>
              Quitar foto
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}
