import { useCallback, useEffect, useState, type FormEvent } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody, CardHead } from '../../components/ui/Card';
import Btn from '../../components/ui/Btn';
import {
  actualizarContenidoLanding,
  obtenerContenidoLanding,
  type CambiosLanding,
  type ContenidoLanding,
  type HorarioMisa,
  type HorarioOficina,
} from '../../api/landing';
import styles from './ContenidoPublicoPage.module.css';
import { getApiErrorMessage } from '../../utils/apiError';

function clonarContenido(contenido: ContenidoLanding): ContenidoLanding {
  return {
    ...contenido,
    quienes_somos: { ...contenido.quienes_somos },
    valores_encabezado: { ...contenido.valores_encabezado },
    valores: contenido.valores.map((valor) => ({ ...valor })),
    horarios_misa: contenido.horarios_misa.map((horario) => ({ ...horario, horas: [...horario.horas] })),
    horarios_oficina: contenido.horarios_oficina.map((horario) => ({ ...horario })),
    contacto: { ...contenido.contacto },
  };
}

function cambiosDeTexto<T extends Record<string, string>>(original: T, borrador: T): Partial<T> {
  const cambios: Partial<T> = {};
  (Object.keys(original) as Array<keyof T>).forEach((campo) => {
    if (original[campo] !== borrador[campo]) cambios[campo] = borrador[campo];
  });
  return cambios;
}

function obtenerCambios(original: ContenidoLanding, borrador: ContenidoLanding): CambiosLanding {
  const cambios: CambiosLanding = {};
  const camposSimples: Array<keyof Pick<ContenidoLanding,
    'lema' | 'titulo_principal' | 'descripcion_principal' | 'cantidad_grupos' | 'cantidad_espacios'
  >> = ['lema', 'titulo_principal', 'descripcion_principal', 'cantidad_grupos', 'cantidad_espacios'];

  camposSimples.forEach((campo) => {
    if (original[campo] !== borrador[campo]) Object.assign(cambios, { [campo]: borrador[campo] });
  });

  const quienesSomos = cambiosDeTexto(original.quienes_somos, borrador.quienes_somos);
  if (Object.keys(quienesSomos).length) cambios.quienes_somos = quienesSomos;

  const encabezadoValores = cambiosDeTexto(original.valores_encabezado, borrador.valores_encabezado);
  if (Object.keys(encabezadoValores).length) cambios.valores_encabezado = encabezadoValores;

  const contacto = cambiosDeTexto(original.contacto, borrador.contacto);
  if (Object.keys(contacto).length) cambios.contacto = contacto;

  if (JSON.stringify(original.valores) !== JSON.stringify(borrador.valores)) cambios.valores = borrador.valores;
  if (JSON.stringify(original.horarios_misa) !== JSON.stringify(borrador.horarios_misa)) cambios.horarios_misa = borrador.horarios_misa;
  if (JSON.stringify(original.horarios_oficina) !== JSON.stringify(borrador.horarios_oficina)) cambios.horarios_oficina = borrador.horarios_oficina;

  return cambios;
}

interface CampoTextoProps {
  id: string;
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  maxLength: number;
  requerido?: boolean;
  multilinea?: boolean;
  tipo?: 'email' | 'tel' | 'text';
  ayuda?: string;
}

function CampoTexto({ id, etiqueta, valor, alCambiar, maxLength, requerido = false, multilinea = false, tipo = 'text', ayuda }: CampoTextoProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {etiqueta}{requerido && <span aria-hidden="true"> *</span>}
      </label>
      {multilinea ? (
        <textarea id={id} className={styles.textarea} value={valor} required={requerido} maxLength={maxLength}
          onChange={(event) => alCambiar(event.target.value)} rows={4} />
      ) : (
        <input id={id} className={styles.input} type={tipo} value={valor} required={requerido} maxLength={maxLength}
          onChange={(event) => alCambiar(event.target.value)} />
      )}
      {ayuda && <small className={styles.help}>{ayuda}</small>}
    </div>
  );
}

export default function ContenidoPublicoPage() {
  const [original, setOriginal] = useState<ContenidoLanding | null>(null);
  const [borrador, setBorrador] = useState<ContenidoLanding | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarContenido = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const contenido = await obtenerContenidoLanding();
      setOriginal(clonarContenido(contenido));
      setBorrador(clonarContenido(contenido));
    } catch (errorCarga) {
      setError(getApiErrorMessage(errorCarga, 'No se pudo cargar el contenido público. Intenta nuevamente.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarContenido();
  }, [cargarContenido]);

  const guardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!original || !borrador || guardando) return;

    const cambios = obtenerCambios(original, borrador);
    if (!Object.keys(cambios).length) {
      setMensaje('No hay cambios pendientes por publicar.');
      setError('');
      return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      await actualizarContenidoLanding(cambios);
      try {
        const contenidoActualizado = await obtenerContenidoLanding();
        setOriginal(clonarContenido(contenidoActualizado));
        setBorrador(clonarContenido(contenidoActualizado));
      } catch {
        // El PATCH ya confirmó la publicación; se conserva el borrador hasta la próxima recarga.
        setOriginal(clonarContenido(borrador));
      }
      setMensaje('Los cambios se publicaron y ya están disponibles en el portal.');
    } catch (errorGuardado) {
      setError(getApiErrorMessage(errorGuardado, 'No se pudieron publicar los cambios. Tus datos permanecen en el formulario.'));
    } finally {
      setGuardando(false);
    }
  };

  const actualizar = (cambio: (contenido: ContenidoLanding) => ContenidoLanding) => {
    setBorrador((contenido) => contenido ? cambio(contenido) : contenido);
    setMensaje('');
  };

  if (cargando && !borrador) {
    return (
      <div className={styles.page} aria-busy="true">
        <PageHeader kicker="Portal público" title="Contenido público" subtitle="Cargando la información editorial del portal." />
        <p className={styles.loading} role="status">Cargando contenido…</p>
      </div>
    );
  }

  if (!borrador) {
    return (
      <div className={styles.page}>
        <PageHeader kicker="Portal público" title="Contenido público" subtitle="Administra la información mostrada en la landing." />
        <div className={styles.error} role="alert">{error}</div>
        <Btn kind="primary" onClick={() => void cargarContenido()}>Reintentar</Btn>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Portal público"
        title="Contenido público"
        subtitle="Edita los textos, cifras, valores, horarios y datos de contacto que se publican en la landing."
        actions={<Btn kind="ghost" onClick={() => void cargarContenido()} disabled={guardando}>Descartar cambios</Btn>}
      />

      <div className={styles.notice}>
        <strong>Publicación inmediata.</strong> Al guardar, los cambios se verán en el portal público. El nombre de la parroquia y el texto del pie se administran desde la base de contenido y no se editan aquí.
      </div>

      {mensaje && <p className={styles.success} role="status">{mensaje}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      <form className={styles.form} onSubmit={guardar} aria-busy={guardando}>
        <fieldset className={styles.fieldset} disabled={guardando}>
          <Card>
            <CardHead title="Presentación principal" />
            <CardBody className={styles.cardBody}>
              <div className={styles.grid}>
                <CampoTexto id="lema" etiqueta="Lema" valor={borrador.lema} requerido maxLength={255}
                  alCambiar={(lema) => actualizar((contenido) => ({ ...contenido, lema }))} />
                <CampoTexto id="titulo-principal" etiqueta="Título principal" valor={borrador.titulo_principal} requerido maxLength={255}
                  alCambiar={(titulo_principal) => actualizar((contenido) => ({ ...contenido, titulo_principal }))} />
              </div>
              <CampoTexto id="descripcion-principal" etiqueta="Descripción principal" valor={borrador.descripcion_principal} requerido multilinea maxLength={5000}
                alCambiar={(descripcion_principal) => actualizar((contenido) => ({ ...contenido, descripcion_principal }))} />
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Quiénes somos" />
            <CardBody className={styles.cardBody}>
              <CampoTexto id="quienes-titulo" etiqueta="Título" valor={borrador.quienes_somos.titulo} requerido maxLength={255}
                alCambiar={(titulo) => actualizar((contenido) => ({ ...contenido, quienes_somos: { ...contenido.quienes_somos, titulo } }))} />
              <CampoTexto id="quienes-descripcion" etiqueta="Descripción" valor={borrador.quienes_somos.descripcion} requerido multilinea maxLength={5000}
                alCambiar={(descripcion) => actualizar((contenido) => ({ ...contenido, quienes_somos: { ...contenido.quienes_somos, descripcion } }))} />
              <div className={styles.grid}>
                <CampoTexto id="quienes-mision" etiqueta="Nuestra misión" valor={borrador.quienes_somos.mision} requerido multilinea maxLength={5000}
                  alCambiar={(mision) => actualizar((contenido) => ({ ...contenido, quienes_somos: { ...contenido.quienes_somos, mision } }))} />
                <CampoTexto id="quienes-comunidad" etiqueta="Nuestra comunidad" valor={borrador.quienes_somos.comunidad} requerido multilinea maxLength={5000}
                  alCambiar={(comunidad) => actualizar((contenido) => ({ ...contenido, quienes_somos: { ...contenido.quienes_somos, comunidad } }))} />
              </div>
              <CampoTexto id="quienes-servicio" etiqueta="Nuestro servicio" valor={borrador.quienes_somos.servicio} requerido multilinea maxLength={5000}
                alCambiar={(servicio) => actualizar((contenido) => ({ ...contenido, quienes_somos: { ...contenido.quienes_somos, servicio } }))} />
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Cifras de la comunidad" />
            <CardBody className={styles.cardBody}>
              <div className={styles.grid}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="cantidad-grupos">Grupos pastorales <span aria-hidden="true">*</span></label>
                  <input id="cantidad-grupos" className={styles.input} type="number" min="0" max="1000000" required value={borrador.cantidad_grupos}
                    onChange={(event) => actualizar((contenido) => ({ ...contenido, cantidad_grupos: Number(event.target.value) }))} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="cantidad-espacios">Espacios parroquiales <span aria-hidden="true">*</span></label>
                  <input id="cantidad-espacios" className={styles.input} type="number" min="0" max="1000000" required value={borrador.cantidad_espacios}
                    onChange={(event) => actualizar((contenido) => ({ ...contenido, cantidad_espacios: Number(event.target.value) }))} />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Nuestros valores" />
            <CardBody className={styles.cardBody}>
              <div className={styles.grid}>
                <CampoTexto id="valores-titulo" etiqueta="Título de la sección" valor={borrador.valores_encabezado.titulo} requerido maxLength={255}
                  alCambiar={(titulo) => actualizar((contenido) => ({ ...contenido, valores_encabezado: { ...contenido.valores_encabezado, titulo } }))} />
                <CampoTexto id="valores-descripcion" etiqueta="Descripción de la sección" valor={borrador.valores_encabezado.descripcion} requerido multilinea maxLength={5000}
                  alCambiar={(descripcion) => actualizar((contenido) => ({ ...contenido, valores_encabezado: { ...contenido.valores_encabezado, descripcion } }))} />
              </div>
              <div className={styles.dynamicHeader}>
                <div>
                  <h2 className={styles.subheading}>Tarjetas de valores</h2>
                  <p className={styles.help}>Puedes publicar hasta 20 valores o dejar la lista vacía.</p>
                </div>
                <Btn type="button" kind="ghost" size="sm" disabled={borrador.valores.length >= 20}
                  onClick={() => actualizar((contenido) => ({ ...contenido, valores: [...contenido.valores, { titulo: '', descripcion: '' }] }))}>
                  Agregar valor
                </Btn>
              </div>
              <div className={styles.dynamicList}>
                {borrador.valores.map((valor, indice) => (
                  <article className={styles.dynamicItem} key={`valor-${indice}`}>
                    <div className={styles.itemHeader}>
                      <h3>Valor {String(indice + 1).padStart(2, '0')}</h3>
                      <Btn type="button" kind="bad" size="sm" onClick={() => actualizar((contenido) => ({
                        ...contenido, valores: contenido.valores.filter((_, posicion) => posicion !== indice),
                      }))}>Eliminar</Btn>
                    </div>
                    <div className={styles.grid}>
                      <CampoTexto id={`valor-titulo-${indice}`} etiqueta="Título" valor={valor.titulo} requerido maxLength={255}
                        alCambiar={(titulo) => actualizar((contenido) => ({ ...contenido, valores: contenido.valores.map((item, posicion) => posicion === indice ? { ...item, titulo } : item) }))} />
                      <CampoTexto id={`valor-descripcion-${indice}`} etiqueta="Descripción" valor={valor.descripcion} requerido multilinea maxLength={2000}
                        alCambiar={(descripcion) => actualizar((contenido) => ({ ...contenido, valores: contenido.valores.map((item, posicion) => posicion === indice ? { ...item, descripcion } : item) }))} />
                    </div>
                  </article>
                ))}
                {!borrador.valores.length && <p className={styles.empty}>No hay valores publicados.</p>}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Horarios" />
            <CardBody className={styles.cardBody}>
              <div className={styles.scheduleColumns}>
                <section aria-labelledby="horarios-misa-titulo">
                  <div className={styles.dynamicHeader}>
                    <div>
                      <h2 id="horarios-misa-titulo" className={styles.subheading}>Misas</h2>
                      <p className={styles.help}>Cada día de misa necesita al menos una hora.</p>
                    </div>
                    <Btn type="button" kind="ghost" size="sm" disabled={borrador.horarios_misa.length >= 30}
                      onClick={() => actualizar((contenido) => ({ ...contenido, horarios_misa: [...contenido.horarios_misa, { dias: '', horas: [''] }] }))}>
                      Agregar horario
                    </Btn>
                  </div>
                  <div className={styles.dynamicList}>
                    {borrador.horarios_misa.map((horario, indice) => (
                      <HorarioMisaEditor key={`misa-${indice}`} horario={horario} indice={indice}
                        alCambiar={(nuevoHorario) => actualizar((contenido) => ({ ...contenido, horarios_misa: contenido.horarios_misa.map((item, posicion) => posicion === indice ? nuevoHorario : item) }))}
                        alEliminar={() => actualizar((contenido) => ({ ...contenido, horarios_misa: contenido.horarios_misa.filter((_, posicion) => posicion !== indice) }))} />
                    ))}
                    {!borrador.horarios_misa.length && <p className={styles.empty}>No hay horarios de misa publicados.</p>}
                  </div>
                </section>

                <section aria-labelledby="horarios-oficina-titulo">
                  <div className={styles.dynamicHeader}>
                    <div>
                      <h2 id="horarios-oficina-titulo" className={styles.subheading}>Oficina parroquial</h2>
                      <p className={styles.help}>El horario acepta texto para representar rangos.</p>
                    </div>
                    <Btn type="button" kind="ghost" size="sm" disabled={borrador.horarios_oficina.length >= 30}
                      onClick={() => actualizar((contenido) => ({ ...contenido, horarios_oficina: [...contenido.horarios_oficina, { dias: '', horario: '' }] }))}>
                      Agregar horario
                    </Btn>
                  </div>
                  <div className={styles.dynamicList}>
                    {borrador.horarios_oficina.map((horario, indice) => (
                      <HorarioOficinaEditor key={`oficina-${indice}`} horario={horario} indice={indice}
                        alCambiar={(nuevoHorario) => actualizar((contenido) => ({ ...contenido, horarios_oficina: contenido.horarios_oficina.map((item, posicion) => posicion === indice ? nuevoHorario : item) }))}
                        alEliminar={() => actualizar((contenido) => ({ ...contenido, horarios_oficina: contenido.horarios_oficina.filter((_, posicion) => posicion !== indice) }))} />
                    ))}
                    {!borrador.horarios_oficina.length && <p className={styles.empty}>No hay horarios de oficina publicados.</p>}
                  </div>
                </section>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Contacto" />
            <CardBody className={styles.cardBody}>
              <div className={styles.grid}>
                <CampoTexto id="contacto-titulo" etiqueta="Título" valor={borrador.contacto.titulo} requerido maxLength={255}
                  alCambiar={(titulo) => actualizar((contenido) => ({ ...contenido, contacto: { ...contenido.contacto, titulo } }))} />
                <CampoTexto id="contacto-correo" etiqueta="Correo electrónico" valor={borrador.contacto.correo} tipo="email" maxLength={255}
                  alCambiar={(correo) => actualizar((contenido) => ({ ...contenido, contacto: { ...contenido.contacto, correo } }))} />
                <CampoTexto id="contacto-direccion" etiqueta="Dirección" valor={borrador.contacto.direccion} multilinea maxLength={1000}
                  alCambiar={(direccion) => actualizar((contenido) => ({ ...contenido, contacto: { ...contenido.contacto, direccion } }))} />
                <CampoTexto id="contacto-telefono" etiqueta="Teléfono" valor={borrador.contacto.telefono} tipo="tel" maxLength={50}
                  ayuda="Puedes usar dígitos, espacios, guiones, paréntesis y el prefijo +."
                  alCambiar={(telefono) => actualizar((contenido) => ({ ...contenido, contacto: { ...contenido.contacto, telefono } }))} />
              </div>
            </CardBody>
          </Card>
        </fieldset>

        <div className={styles.actions}>
          <Btn type="submit" kind="primary" disabled={guardando}>{guardando ? 'Publicando…' : 'Guardar y publicar cambios'}</Btn>
        </div>
      </form>
    </div>
  );
}

interface HorarioMisaEditorProps {
  horario: HorarioMisa;
  indice: number;
  alCambiar: (horario: HorarioMisa) => void;
  alEliminar: () => void;
}

function HorarioMisaEditor({ horario, indice, alCambiar, alEliminar }: HorarioMisaEditorProps) {
  const actualizarHora = (posicion: number, hora: string) => alCambiar({
    ...horario,
    horas: horario.horas.map((actual, indiceHora) => indiceHora === posicion ? hora : actual),
  });

  return (
    <article className={styles.dynamicItem}>
      <div className={styles.itemHeader}>
        <h3>Horario de misa {indice + 1}</h3>
        <Btn type="button" kind="bad" size="sm" onClick={alEliminar}>Eliminar</Btn>
      </div>
      <CampoTexto id={`misa-dias-${indice}`} etiqueta="Días" valor={horario.dias} requerido maxLength={255}
        alCambiar={(dias) => alCambiar({ ...horario, dias })} />
      <div className={styles.field}>
        <span className={styles.label}>Horas <span aria-hidden="true">*</span></span>
        <div className={styles.timeList}>
          {horario.horas.map((hora, indiceHora) => (
            <div className={styles.timeRow} key={`misa-${indice}-hora-${indiceHora}`}>
              <input className={styles.timeInput} type="time" required value={hora}
                aria-label={`Hora ${indiceHora + 1} del horario de misa ${indice + 1}`}
                onChange={(event) => actualizarHora(indiceHora, event.target.value)} />
              <button type="button" className={styles.removeText} disabled={horario.horas.length === 1}
                aria-label={`Eliminar hora ${indiceHora + 1} del horario de misa ${indice + 1}`}
                onClick={() => alCambiar({ ...horario, horas: horario.horas.filter((_, posicion) => posicion !== indiceHora) })}>Quitar</button>
            </div>
          ))}
          <button type="button" className={styles.addText} disabled={horario.horas.length >= 24}
            onClick={() => alCambiar({ ...horario, horas: [...horario.horas, ''] })}>+ Agregar hora</button>
        </div>
      </div>
    </article>
  );
}

interface HorarioOficinaEditorProps {
  horario: HorarioOficina;
  indice: number;
  alCambiar: (horario: HorarioOficina) => void;
  alEliminar: () => void;
}

function HorarioOficinaEditor({ horario, indice, alCambiar, alEliminar }: HorarioOficinaEditorProps) {
  return (
    <article className={styles.dynamicItem}>
      <div className={styles.itemHeader}>
        <h3>Horario de oficina {indice + 1}</h3>
        <Btn type="button" kind="bad" size="sm" onClick={alEliminar}>Eliminar</Btn>
      </div>
      <CampoTexto id={`oficina-dias-${indice}`} etiqueta="Días" valor={horario.dias} requerido maxLength={255}
        alCambiar={(dias) => alCambiar({ ...horario, dias })} />
      <CampoTexto id={`oficina-horario-${indice}`} etiqueta="Horario" valor={horario.horario} requerido maxLength={500}
        alCambiar={(nuevoHorario) => alCambiar({ ...horario, horario: nuevoHorario })} />
    </article>
  );
}
