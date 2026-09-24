import { useRef, useState, type FormEvent } from 'react';
import axios from 'axios';
import { notificarAusencia } from '../../../api/ausencias';
import { useAuth } from '../../../context/AuthContext';
import Btn from '../../../components/ui/Btn';
import { TextareaUI } from '../../../components/ui/Field';
import form from '../../../styles/Form.module.css';
import styles from './NotificarAusenciaForm.module.css';

export default function NotificarAusenciaForm() {
  const { usuario } = useAuth();
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [titulo, setTitulo] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);
  const enCurso = useRef(false);
  const fechasInvalidas = Boolean(inicio && fin && inicio > fin);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enCurso.current) return;
    setError('');
    setExito(false);
    if (!inicio || !fin || fechasInvalidas) {
      setError('Selecciona ambas fechas. La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }
    if (!titulo.trim() || !justificacion.trim() || titulo.trim().length > 255 || justificacion.trim().length > 5000) {
      setError('Completa la razón (máximo 255 caracteres) y la justificación (máximo 5000 caracteres).');
      return;
    }
    if (!usuario) return;
    enCurso.current = true;
    setEnviando(true);
    try {
      await notificarAusencia({ ministro_id: usuario.id, fecha_inicio: inicio, fecha_fin: fin,
        titulo: titulo.trim(), justificacion: justificacion.trim() });
      setExito(true);
      setInicio(''); setFin(''); setTitulo(''); setJustificacion('');
    } catch (err) {
      const mensaje = axios.isAxiosError<{ mensaje?: string }>(err) ? err.response?.data?.mensaje : undefined;
      setError(mensaje || 'No se pudo enviar la notificación. Tus datos se conservaron; vuelve a intentarlo.');
    } finally {
      enCurso.current = false;
      setEnviando(false);
    }
  }

  return (
    <form className={form.form} onSubmit={enviar} aria-label="Notificar periodo de ausencia" aria-busy={enviando}
      onChange={() => { setExito(false); setError(''); }}>
      <p className={form.infoBox}>La notificación se enviará a todos los coordinadores de ministros y sacerdotes de la parroquia.</p>
      {exito && <p role="status" className={`${form.message} ${form.messageSuccess}`}>Ausencia registrada. Se notificó a los coordinadores de ministros y sacerdotes.</p>}
      {error && <p role="alert" className={`${form.message} ${form.messageError}`}>{error}</p>}
      <fieldset disabled={enviando} className={styles.fields}>
        <div className={styles.dates}>
          <div className={form.field}>
            <label htmlFor="ausencia-inicio" className={`${form.label} ${form.required}`}>Fecha de inicio</label>
            <input id="ausencia-inicio" type="date" className={form.input} required value={inicio}
              max={fin || '9999-12-31'} min="1000-01-01" onChange={e => setInicio(e.target.value)}
              aria-invalid={fechasInvalidas} aria-describedby="ausencia-fechas-ayuda" />
          </div>
          <div className={form.field}>
            <label htmlFor="ausencia-fin" className={`${form.label} ${form.required}`}>Fecha de fin</label>
            <input id="ausencia-fin" type="date" className={form.input} required value={fin}
              min={inicio || '1000-01-01'} max="9999-12-31" onChange={e => setFin(e.target.value)}
              aria-invalid={fechasInvalidas} aria-describedby="ausencia-fechas-ayuda" />
          </div>
        </div>
        <p id="ausencia-fechas-ayuda" className={fechasInvalidas ? `${form.message} ${form.messageError}` : form.fieldNote}>
          {fechasInvalidas ? 'La fecha de inicio no puede ser posterior a la fecha de fin.' : 'Ambas fechas están incluidas. Para ausentarte un solo día, selecciona la misma fecha.'}
        </p>
        <div className={form.field}>
          <label htmlFor="ausencia-titulo" className={`${form.label} ${form.required}`}>Razón de la ausencia</label>
          <input id="ausencia-titulo" className={form.input} required maxLength={255} value={titulo}
            onChange={e => setTitulo(e.target.value)} placeholder="Ej. Viaje familiar" />
        </div>
        <div className={form.field}>
          <label htmlFor="ausencia-justificacion" className={`${form.label} ${form.required}`}>Justificación o descripción</label>
          <TextareaUI id="ausencia-justificacion" required maxLength={5000} rows={4} value={justificacion}
            onChange={e => setJustificacion(e.target.value)} placeholder="Explica el motivo de tu ausencia" />
        </div>
        <Btn type="submit" disabled={enviando}>{enviando ? 'Enviando notificación…' : 'Notificar ausencia'}</Btn>
      </fieldset>
    </form>
  );
}
