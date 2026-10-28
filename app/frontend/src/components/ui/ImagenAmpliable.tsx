import { useEffect, useId, useRef, useState, type ImgHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import styles from './ImagenAmpliable.module.css';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'onClick'> & {
  src: string;
  alt: string;
  triggerClassName?: string;
};

function VisorImagen({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const tituloId = useId();
  const cierre = useRef<number | null>(null);
  const [cerrando, setCerrando] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [natural, setNatural] = useState({ ancho: 0, alto: 0 });
  const [area, setArea] = useState({ ancho: 0, alto: 0 });
  const [estado, setEstado] = useState<'cargando' | 'lista' | 'error'>('cargando');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current!;
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      if (cierre.current !== null) window.clearTimeout(cierre.current);
      dialog.close();
      document.body.style.overflow = overflow;
      if (anterior?.isConnected) anterior.focus();
    };
  }, []);

  useEffect(() => {
    const el = areaRef.current!;
    const medir = () => setArea({ ancho: el.clientWidth, alto: el.clientHeight });
    medir();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir);
    observer?.observe(el);
    window.addEventListener('resize', medir);
    return () => { observer?.disconnect(); window.removeEventListener('resize', medir); };
  }, []);

  const cerrar = () => {
    if (cierre.current !== null) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { onClose(); return; }
    setCerrando(true);
    cierre.current = window.setTimeout(onClose, 160);
  };

  const escala = natural.ancho && natural.alto ? Math.min((area.ancho || natural.ancho) / natural.ancho, (area.alto || natural.alto) / natural.alto) : 1;
  const ancho = natural.ancho * escala * zoom;
  const alto = natural.alto * escala * zoom;
  const ajustar = () => { setZoom(1); areaRef.current?.scrollTo?.({ top: 0, left: 0 }); };

  return <dialog ref={dialogRef} className={`${styles.dialog}${cerrando ? ` ${styles.cerrando}` : ''}`} aria-labelledby={tituloId}
    onCancel={event => { event.preventDefault(); cerrar(); }}
    onKeyDown={event => event.stopPropagation()}
    onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) cerrar(); }}>
    <header className={styles.header}>
      <h2 id={tituloId}>Imagen ampliada</h2>
      <button type="button" className={styles.control} onClick={cerrar} aria-label="Cerrar imagen">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    </header>
    <div className={styles.toolbar} role="group" aria-label="Zoom de la imagen">
      <button type="button" className={styles.control} aria-label="Alejar imagen" disabled={zoom <= 1 || estado !== 'lista'} onClick={() => setZoom(z => Math.max(1, z - .5))}>−</button>
      <span className={styles.zoom} aria-live="polite">{Math.round(zoom * 100)}%</span>
      <button type="button" className={styles.control} aria-label="Acercar imagen" disabled={zoom >= 3 || estado !== 'lista'} onClick={() => setZoom(z => Math.min(3, z + .5))}>+</button>
      <button type="button" className={styles.control} disabled={estado !== 'lista'} onClick={ajustar}>Ajustar</button>
    </div>
    <div ref={areaRef} className={styles.viewport} style={{ aspectRatio: natural.ancho && natural.alto ? `${natural.ancho} / ${natural.alto}` : undefined }} tabIndex={0} aria-label="Imagen ampliada; desplázate para recorrerla al acercar">
      <div className={styles.canvas} style={{ width: Math.max(ancho, area.ancho) || undefined, height: Math.max(alto, area.alto) || undefined }}
        onClick={event => { if (event.target === event.currentTarget) cerrar(); }}>
        {estado === 'cargando' && <p className={styles.mensaje} role="status">Cargando imagen…</p>}
        {estado === 'error' ? <div className={styles.mensaje} role="alert">
          <p>No se pudo cargar la imagen.</p>
          <button type="button" className={styles.control} onClick={() => { setEstado('cargando'); setIntento(i => i + 1); ajustar(); }}>Reintentar</button>
        </div> : <img key={intento} src={src} alt={alt} className={styles.ampliada} draggable={false}
          style={{ width: ancho || undefined, height: alto || undefined, visibility: estado === 'cargando' ? 'hidden' : 'visible' }}
          onLoad={event => { setNatural({ ancho: event.currentTarget.naturalWidth, alto: event.currentTarget.naturalHeight }); setEstado('lista'); }}
          onError={() => setEstado('error')} />}
      </div>
    </div>
    <p className={styles.caption}>{alt}</p>
  </dialog>;
}

/** Fotografías ampliables; conserva el estilo de la miniatura y sus eventos de carga. */
export default function ImagenAmpliable({ src, alt, triggerClassName = '', ...props }: Props) {
  const [abierta, setAbierta] = useState(false);
  return <>
    <button type="button" className={`${styles.trigger} ${triggerClassName}`} aria-label={`Ampliar imagen: ${alt}`} aria-haspopup="dialog"
      onClick={event => { event.stopPropagation(); setAbierta(true); }}>
      <img {...props} src={src} alt={alt} />
    </button>
    {abierta && createPortal(<VisorImagen key={src} src={src} alt={alt} onClose={() => setAbierta(false)} />, document.body)}
  </>;
}
