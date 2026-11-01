import { useEffect, useRef, useState, type FormEvent } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card, CardBody, CardHead } from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Btn from '../../components/ui/Btn';
import { getApiErrorMessage } from '../../utils/apiError';
import styles from './FotoPerfilForm.module.css';

export default function FotoPerfilForm() {
  const { usuario, actualizarUsuario } = useAuth();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const enCurso = useRef(false);
  const activo = useRef(true);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    activo.current = true;
    return () => { activo.current = false; };
  }, []);

  useEffect(() => {
    if (!archivo) { setPreview(''); return; }
    const url = URL.createObjectURL(archivo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  async function guardar(event: FormEvent) {
    event.preventDefault();
    if (!archivo || !usuario || enCurso.current) return;
    enCurso.current = true;
    setGuardando(true); setError(''); setMensaje('');
    try {
      const datos = new FormData();
      datos.append('imagen', archivo);
      const { data } = await apiClient.put<{ foto_url: string }>(`/api/personas/${usuario.id}/foto`, datos);
      if (!activo.current) return;
      actualizarUsuario({ ...usuario, foto_url: data.foto_url });
      setArchivo(null);
      if (input.current) input.current.value = '';
      setMensaje('Tu foto de perfil se actualizó correctamente.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo guardar la foto. Intenta nuevamente.'));
    } finally { enCurso.current = false; setGuardando(false); }
  }

  return <Card>
    <CardHead title="Foto de perfil" />
    <CardBody>
      <form onSubmit={guardar} className={styles.form} aria-label="Cambiar foto de perfil" aria-busy={guardando}>
        {preview ? <img className={styles.avatar} src={preview} alt="Vista previa de tu nueva foto" />
          : <Avatar className={styles.avatar} nombre={usuario?.nombre ?? 'Usuario'} fotoUrl={usuario?.foto_url} />}
        <div className={styles.controls}>
          <label htmlFor="perfil-foto">Subir o cambiar foto</label>
          <p id="perfil-foto-ayuda">JPEG, PNG o WebP, hasta 10 MB. Se guardará en formato cuadrado.</p>
          <input ref={input} id="perfil-foto" type="file" accept="image/jpeg,image/png,image/webp" disabled={guardando} hidden
            aria-describedby="perfil-foto-ayuda" onChange={event => {
              const foto = event.target.files?.[0] ?? null;
              setError(''); setMensaje(''); setArchivo(null);
              if (foto && (!['image/jpeg', 'image/png', 'image/webp'].includes(foto.type) || foto.size > 10 * 1024 * 1024)) {
                setError('Selecciona una imagen JPEG, PNG o WebP de hasta 10 MB.');
                event.target.value = ''; return;
              }
              setArchivo(foto);
            }} />
          <div className={styles.filePicker}>
            <Btn type="button" kind="cream" disabled={guardando} aria-describedby="perfil-foto-ayuda perfil-foto-nombre"
              onClick={() => input.current?.click()}>
              Seleccionar imagen
            </Btn>
            <span id="perfil-foto-nombre" className={styles.fileName} aria-live="polite">
              {archivo?.name ?? 'Ninguna imagen seleccionada'}
            </span>
          </div>
          <Btn type="submit" kind="primary" disabled={!archivo || guardando}>{guardando ? 'Guardando foto…' : 'Guardar foto'}</Btn>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          {mensaje && <p role="status">{mensaje}</p>}
        </div>
      </form>
    </CardBody>
  </Card>;
}
