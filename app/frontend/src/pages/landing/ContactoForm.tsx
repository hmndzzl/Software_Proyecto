import { useRef, useState, type FormEvent } from 'react';
import axios from 'axios';
import { enviarContacto } from '../../api/contacto';

const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO_LOCAL_REGEX = /^\d{8}$/;
// Único código de país soportado hoy. Si la parroquia necesita aceptar otros
// códigos en el futuro, esto se reemplaza por un <select> de códigos — el
// backend ya es agnóstico al código (ver TELEFONO_REGEX en contacto.controller.ts).
const CODIGO_PAIS = '+502';

const MOTIVOS = [
  'Información general',
  'Sacramentos (bautismo, matrimonio, confirmación)',
  'Reserva de salón o espacio',
  'Sumarme a un grupo pastoral',
  'Apoyo o acompañamiento',
  'Otro',
];
const MOTIVO_OTRO = 'Otro';

export default function ContactoForm() {
  const [nombre, setNombre] = useState('');
  const [telefonoLocal, setTelefonoLocal] = useState('');
  const [correo, setCorreo] = useState('');
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [motivoOtro, setMotivoOtro] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);
  const enCurso = useRef(false);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enCurso.current) return;
    setError('');
    setExito(false);

    const nombreLimpio = nombre.trim();
    const correoLimpio = correo.trim();
    const mensajeLimpio = mensaje.trim();
    const telefonoLocalLimpio = telefonoLocal.trim();

    if (!nombreLimpio || nombreLimpio.length > 255) {
      setError('Ingresa tu nombre (máximo 255 caracteres).');
      return;
    }
    if (!correoLimpio || !CORREO_REGEX.test(correoLimpio) || correoLimpio.length > 255) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    if (!mensajeLimpio || mensajeLimpio.length > 5000) {
      setError('Escribe tu mensaje (máximo 5000 caracteres).');
      return;
    }
    if (telefonoLocalLimpio && !TELEFONO_LOCAL_REGEX.test(telefonoLocalLimpio)) {
      setError('El teléfono debe tener 8 dígitos.');
      return;
    }
    const motivoOtroLimpio = motivoOtro.trim();
    if (motivo === MOTIVO_OTRO && (!motivoOtroLimpio || motivoOtroLimpio.length > 255)) {
      setError('Especifica el motivo (máximo 255 caracteres).');
      return;
    }

    enCurso.current = true;
    setEnviando(true);
    try {
      await enviarContacto({
        nombre: nombreLimpio,
        correo: correoLimpio,
        telefono: telefonoLocalLimpio ? `${CODIGO_PAIS}${telefonoLocalLimpio}` : undefined,
        motivo: motivo === MOTIVO_OTRO ? `Otro: ${motivoOtroLimpio}` : motivo,
        mensaje: mensajeLimpio,
      });
      setExito(true);
      setNombre(''); setTelefonoLocal(''); setCorreo(''); setMotivo(MOTIVOS[0]); setMotivoOtro(''); setMensaje('');
    } catch (err) {
      const mensajeApi = axios.isAxiosError<{ mensaje?: string }>(err) ? err.response?.data?.mensaje : undefined;
      setError(mensajeApi || 'No se pudo enviar el mensaje. Tus datos se conservaron; vuelve a intentarlo.');
    } finally {
      enCurso.current = false;
      setEnviando(false);
    }
  }

  return (
    <form className="form" onSubmit={enviar} aria-label="Envíanos un mensaje" aria-busy={enviando}>
      <h3>Envíanos un mensaje</h3>
      <p className="muted" style={{ fontSize: 15 }}>Completa el formulario y la oficina parroquial te contactará.</p>
      <fieldset disabled={enviando} style={{ border: 'none', padding: 0, margin: 0 }}>
        <div className="fgrid">
          <div className="field">
            <label htmlFor="c-nombre">Nombre <span className="req">*</span></label>
            <input id="c-nombre" type="text" required maxLength={255} placeholder="María Elena Guzmán"
              value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="c-tel">Teléfono</label>
            <div className="telGroup">
              <span className="telPrefix">{CODIGO_PAIS}</span>
              <input id="c-tel" type="tel" inputMode="numeric" maxLength={8} placeholder="55551234"
                value={telefonoLocal} onChange={e => setTelefonoLocal(e.target.value.replace(/\D/g, '').slice(0, 8))} />
            </div>
          </div>
          <div className="field full">
            <label htmlFor="c-correo">Correo electrónico <span className="req">*</span></label>
            <input id="c-correo" type="email" required maxLength={255} placeholder="tucorreo@ejemplo.com"
              value={correo} onChange={e => setCorreo(e.target.value)} />
          </div>
          <div className="field full">
            <label htmlFor="c-motivo">Motivo</label>
            <select id="c-motivo" value={motivo} onChange={e => setMotivo(e.target.value)}>
              {MOTIVOS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          {motivo === MOTIVO_OTRO && (
            <div className="field full">
              <label htmlFor="c-motivo-otro">Especifica el motivo <span className="req">*</span></label>
              <input id="c-motivo-otro" type="text" required maxLength={255} placeholder="Cuéntanos brevemente el motivo"
                value={motivoOtro} onChange={e => setMotivoOtro(e.target.value)} />
            </div>
          )}
          <div className="field full">
            <label htmlFor="c-msg">Mensaje <span className="req">*</span></label>
            <textarea id="c-msg" required maxLength={5000} placeholder="Cuéntanos en qué podemos ayudarte…"
              value={mensaje} onChange={e => setMensaje(e.target.value)} />
          </div>
        </div>
        <button type="submit" className="btn btn-red" style={{ width: '100%', marginTop: 26 }} disabled={enviando}>
          {enviando ? 'ENVIANDO…' : 'ENVIAR MENSAJE'}
        </button>
        {exito && <p className="fsent" role="status">¡Gracias! Hemos recibido tu mensaje.</p>}
        {error && <p className="ferr" role="alert">{error}</p>}
        <p className="fnote">Tus datos se usan únicamente para responderte. No los compartimos con terceros.</p>
      </fieldset>
    </form>
  );
}
