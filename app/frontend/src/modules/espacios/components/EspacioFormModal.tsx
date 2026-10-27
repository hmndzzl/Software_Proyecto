import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import apiClient from '../../../api/client';
import Modal from '../../../components/ui/Modal';
import Btn from '../../../components/ui/Btn';
import { Field, InputUI } from '../../../components/ui/Field';
import { getApiErrorMessage } from '../../../utils/apiError';
import type { Espacio } from './EspacioCard';
import EspacioFoto from './EspacioFoto';
import styles from './EspacioGestion.module.css';

interface Props {
  espacio?: Espacio;
  open?: boolean;
  onDelete?: () => void;
  onClose: () => void;
  onSaved: () => void;
}

export default function EspacioFormModal({ espacio, open = true, onDelete, onClose, onSaved }: Props) {
  const id = useId();
  const archivoInput = useRef<HTMLInputElement | null>(null);
  const lock = useRef(false);
  const [nombre, setNombre] = useState(espacio?.nombre ?? '');
  const [capacidad, setCapacidad] = useState(espacio?.capacidad?.toString() ?? '');
  const [imagen, setImagen] = useState<File | null>(null);
  const [quitarImagen, setQuitarImagen] = useState(false);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!imagen) { setPreview(''); return; }
    const url = URL.createObjectURL(imagen);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imagen]);

  const seleccionar = (file: File | null) => {
    setError('');
    if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !/\.(jpe?g|png|webp)$/i.test(file.name) || file.size > 10 * 1024 * 1024)) {
      setError('Selecciona una imagen JPEG, PNG o WebP de hasta 10 MB.');
      if (archivoInput.current) archivoInput.current.value = '';
      setImagen(null);
      return;
    }
    setImagen(file);
    if (file) setQuitarImagen(false);
  };

  const guardar = async (event: FormEvent) => {
    event.preventDefault();
    if (lock.current) return;
    if (!nombre.trim()) { setError('El nombre del espacio es obligatorio.'); return; }
    if (!/^\d+$/.test(capacidad) || Number(capacidad) < 1 || Number(capacidad) > 2147483647) {
      setError('La capacidad debe ser un número entero mayor que cero.'); return;
    }
    lock.current = true;
    setGuardando(true); setError('');
    const datos = new FormData();
    datos.set('nombre', nombre.trim()); datos.set('capacidad', capacidad);
    datos.set('quitar_imagen', String(quitarImagen));
    if (imagen) datos.set('imagen', imagen);
    try {
      if (espacio) await apiClient.put(`/api/espacios/${espacio.id}`, datos);
      else await apiClient.post('/api/espacios', datos);
      onSaved();
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo guardar el espacio. Intenta de nuevo.', 'message'));
    } finally { lock.current = false; setGuardando(false); }
  };

  return <Modal open={open} width={640} title={espacio ? 'Editar espacio' : 'Crear espacio'} onClose={onClose} closeDisabled={guardando} initialFocusSelector="input">
    <form className={styles.form} onSubmit={guardar} aria-busy={guardando}>
      <Field label="Nombre del espacio" htmlFor={`${id}-nombre`} required>
        <InputUI id={`${id}-nombre`} value={nombre} onChange={e => setNombre(e.target.value)} maxLength={100} required disabled={guardando} placeholder="Ej. Salón parroquial" />
      </Field>
      <Field label="Capacidad" htmlFor={`${id}-capacidad`} required hint="Cantidad máxima de personas.">
        <InputUI id={`${id}-capacidad`} type="number" required min={1} max={2147483647} step={1} value={capacidad}
          onChange={e => setCapacidad(e.target.value)} disabled={guardando} placeholder="Ej. 50" aria-describedby={`${id}-capacidad-hint`} />
      </Field>
      <Field label="Imagen del espacio" htmlFor={`${id}-imagen`} hint="Opcional. JPEG, PNG o WebP, hasta 10 MB. Solo fotografías sin animación.">
        <div className={styles.filePicker}>
          <input ref={archivoInput} id={`${id}-imagen`} className={styles.fileInput} tabIndex={-1} type="file"
            accept="image/jpeg,image/png,image/webp" disabled={guardando}
            onChange={e => seleccionar(e.target.files?.[0] ?? null)} aria-describedby={`${id}-imagen-hint`} />
          <Btn type="button" kind="ghost" disabled={guardando} aria-controls={`${id}-imagen`} onClick={() => archivoInput.current?.click()}>
            {imagen ? 'Cambiar imagen' : 'Seleccionar imagen'}
          </Btn>
          <span className={styles.fileName} aria-live="polite">{imagen?.name ?? 'Ninguna imagen seleccionada'}</span>
        </div>
      </Field>
      {preview ? <img className={styles.preview} src={preview} alt="Vista previa de la imagen seleccionada" /> :
        espacio?.foto_url && !quitarImagen ? <EspacioFoto className={styles.preview} nombre={espacio.nombre} fotoUrl={espacio.foto_url} /> : null}
      {(imagen || espacio?.foto_url) && <div className={styles.actions}>
        <Btn type="button" kind="ghost" size="sm" disabled={guardando} onClick={() => {
          setImagen(null); setQuitarImagen(!quitarImagen);
          if (archivoInput.current) archivoInput.current.value = '';
        }}>{quitarImagen ? 'Conservar imagen actual' : 'Quitar imagen'}</Btn>
        {quitarImagen && <span className={styles.hint}>Se quitará la imagen al guardar.</span>}
      </div>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.formFooter}>
        {espacio && onDelete && <Btn type="button" kind="ghost" className={styles.deleteAction} disabled={guardando} onClick={onDelete}>Eliminar espacio</Btn>}
        <div className={styles.saveActions}>
          <Btn type="button" kind="ghost" disabled={guardando} onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={guardando}>{guardando ? 'Guardando…' : espacio ? 'Guardar cambios' : 'Crear espacio'}</Btn>
        </div>
      </div>
    </form>
  </Modal>;
}
