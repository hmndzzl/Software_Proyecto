import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../../api/client';
import { ROLES, usuarioTieneRol } from '../../../utils/roles';
import type { DestinatarioInfo, NotificacionTipo } from '../../../types';
import Btn from '../../../components/ui/Btn';
import { Field, SelectUI, TextareaUI } from '../../../components/ui/Field';
import styles from './EnviarNotificacionForm.module.css';

interface Props {
  onEnviada: () => void;
  onCancelar: () => void;
}

const esAdminOSacerdote = () => usuarioTieneRol([ROLES.ADMIN, ROLES.SACERDOTE]);
const esCoordMin        = () => usuarioTieneRol([ROLES.COORDINADOR_MINISTROS]);

export default function EnviarNotificacionForm({ onEnviada, onCancelar }: Props) {
  const [mensaje,       setMensaje]       = useState('');
  const [tipo,          setTipo]          = useState<NotificacionTipo>('individual');
  const [destinatarios, setDestinatarios] = useState<DestinatarioInfo[]>([]);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [enviando,      setEnviando]      = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const puedeEnviarGlobal = esAdminOSacerdote();
  const soloIndividual    = esCoordMin();

  useEffect(() => {
    if (tipo === 'global') return;
    apiClient.get<DestinatarioInfo[]>('/api/notificaciones/destinatarios')
      .then(({ data }) => setDestinatarios(data))
      .catch(() => setDestinatarios([]));
  }, [tipo]);

  // Agrupar destinatarios por rol
  const grupos = useMemo(() => {
    const map = new Map<string, DestinatarioInfo[]>();
    for (const d of destinatarios) {
      const key = d.rol_nombre;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return Array.from(map.entries()); // [['Sacerdote', [...]], ...]
  }, [destinatarios]);

  const toggleSeleccionado = (id: number) =>
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const seleccionarGrupo = (ids: number[]) =>
    setSeleccionados((prev) => Array.from(new Set([...prev, ...ids])));

  const deseleccionarGrupo = (ids: number[]) =>
    setSeleccionados((prev) => prev.filter((x) => !ids.includes(x)));

  const seleccionarTodos = () => setSeleccionados(destinatarios.map((d) => d.id));
  const deseleccionarTodos = () => setSeleccionados([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!mensaje.trim()) { setError('El mensaje es obligatorio.'); return; }
    if (tipo !== 'global' && seleccionados.length === 0) {
      setError('Selecciona al menos un destinatario.'); return;
    }

    setEnviando(true);
    try {
      await apiClient.post('/api/notificaciones', {
        mensaje: mensaje.trim(),
        tipo,
        destinatarios: tipo === 'global' ? [] : seleccionados,
      });
      onEnviada();
    } catch {
      setError('Error al enviar la notificación. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {puedeEnviarGlobal && (
        <Field label="Tipo de notificación">
          <SelectUI
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value as NotificacionTipo);
              setSeleccionados([]);
            }}
          >
            <option value="individual">Individual — destinatarios específicos</option>
            <option value="global">Global — todos los usuarios</option>
          </SelectUI>
        </Field>
      )}

      <Field label="Mensaje" required>
        <TextareaUI
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Escribe el mensaje de la notificación…"
          rows={3}
        />
      </Field>

      {tipo !== 'global' && (
        <Field label={soloIndividual ? 'Tus ministros' : 'Destinatarios'} required>
          <div className={styles.destinatariosHead}>
            <span className={styles.destinatariosCount}>
              {seleccionados.length} seleccionado{seleccionados.length !== 1 ? 's' : ''}
            </span>
            {!soloIndividual && (
              <div className={styles.headActions}>
                <button type="button" className={styles.linkBtn} onClick={seleccionarTodos}>Todos</button>
                <span className={styles.sep}>·</span>
                <button type="button" className={styles.linkBtn} onClick={deseleccionarTodos}>Ninguno</button>
              </div>
            )}
          </div>

          <div className={styles.lista}>
            {destinatarios.length === 0 ? (
              <p className={styles.listaVacia}>Sin destinatarios disponibles.</p>
            ) : (
              grupos.map(([rolNombre, miembros]) => {
                const ids = miembros.map((m) => m.id);
                const todosSeleccionados = ids.every((id) => seleccionados.includes(id));
                return (
                  <div key={rolNombre} className={styles.grupo}>
                    <div className={styles.grupoHeader}>
                      <span className={styles.grupoLabel}>{rolNombre}</span>
                      <div className={styles.grupoActions}>
                        <button
                          type="button"
                          className={styles.linkBtn}
                          onClick={() => todosSeleccionados ? deseleccionarGrupo(ids) : seleccionarGrupo(ids)}
                        >
                          {todosSeleccionados ? 'Quitar todos' : 'Seleccionar todos'}
                        </button>
                      </div>
                    </div>
                    {miembros.map((d) => (
                      <label
                        key={d.id}
                        className={`${styles.item} ${seleccionados.includes(d.id) ? styles.itemSelected : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={seleccionados.includes(d.id)}
                          onChange={() => toggleSeleccionado(d.id)}
                          className={styles.checkbox}
                        />
                        <span className={styles.itemNombre}>{d.nombre}</span>
                      </label>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </Field>
      )}

      {tipo === 'global' && (
        <p className={styles.globalHint}>
          Esta notificación será enviada a <strong>todos los usuarios</strong> del sistema.
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.footer}>
        <Btn kind="ghost" size="md" type="button" onClick={onCancelar}>
          Cancelar
        </Btn>
        <Btn kind="primary" size="md" type="submit" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar notificación'}
        </Btn>
      </div>
    </form>
  );
}
