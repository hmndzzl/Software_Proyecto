import { useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody, CardHead } from '../../components/ui/Card';
import Btn from '../../components/ui/Btn';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/roles';
import apiClient from '../../api/client';
import styles from './ReportesPage.module.css';

type Tipo = 'reservas' | 'tareas';
type Formato = 'csv' | 'pdf';

function fechaLocal(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function rangoSemana(): [string, string] {
  const hoy = new Date();
  const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7));
  const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
  return [fechaLocal(lunes), fechaLocal(domingo)];
}

function rangoMes(): [string, string] {
  const hoy = new Date();
  return [fechaLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), fechaLocal(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0))];
}

function diasInclusivos(desde: string, hasta: string): number {
  return (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000 + 1;
}

function FormularioReporte({ tipo }: { tipo: Tipo }) {
  const [desde, setDesde] = useState(() => tipo === 'tareas' ? rangoSemana()[0] : rangoMes()[0]);
  const [hasta, setHasta] = useState(() => tipo === 'tareas' ? rangoSemana()[1] : rangoMes()[1]);
  const [descargando, setDescargando] = useState<Formato | null>(null);
  const [error, setError] = useState('');
  const maxDias = tipo === 'tareas' ? 31 : 366;
  const rangoInvalido = !desde || !hasta || diasInclusivos(desde, hasta) < 1 || diasInclusivos(desde, hasta) > maxDias;

  function seleccionarRango(rango: [string, string]) {
    setDesde(rango[0]);
    setHasta(rango[1]);
    setError('');
  }

  async function descargar(formato: Formato) {
    if (rangoInvalido || descargando) return;
    setDescargando(formato);
    setError('');
    try {
      const respuesta = await apiClient.get<Blob>(`/api/reportes/${tipo}`, {
        params: { desde, hasta, formato },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(respuesta.data);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `reporte-${tipo}-${desde}-${hasta}.${formato}`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('No se pudo descargar el reporte. Revisa tus permisos o intenta un periodo más corto.');
    } finally {
      setDescargando(null);
    }
  }

  return (
    <Card>
      <CardHead
        title={tipo === 'reservas' ? 'Reservas de salones' : 'Tareas y asignaciones'}
        hint={tipo === 'reservas' ? 'Todas las reservas del periodo, con su estado actual.' : 'Una fila por asignación; incluye tareas sin asignar.'}
      />
      <CardBody>
        <div className={styles.rangos}>
          <Btn kind="ghost" size="sm" onClick={() => seleccionarRango(rangoSemana())}>Esta semana</Btn>
          <Btn kind="ghost" size="sm" onClick={() => seleccionarRango(rangoMes())}>Este mes</Btn>
        </div>
        <div className={styles.campos}>
          <label>Desde
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={styles.fecha} />
          </label>
          <label>Hasta
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={styles.fecha} />
          </label>
        </div>
        <p className={styles.ayuda}>Periodo inclusivo. Máximo {maxDias} días y 1000 filas por reporte.</p>
        {rangoInvalido && <p className={styles.error} role="alert">Selecciona un periodo válido de hasta {maxDias} días.</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.acciones}>
          <Btn onClick={() => void descargar('pdf')} disabled={rangoInvalido || descargando !== null}>
            {descargando === 'pdf' ? 'Preparando PDF…' : 'Descargar PDF'}
          </Btn>
          <Btn kind="cream" onClick={() => void descargar('csv')} disabled={rangoInvalido || descargando !== null}>
            {descargando === 'csv' ? 'Preparando CSV…' : 'Descargar CSV'}
          </Btn>
        </div>
      </CardBody>
    </Card>
  );
}

export default function ReportesPage() {
  const { usuario } = useAuth();
  const puedeVerSalones = usuario?.rol_id === ROLES.SACERDOTE || usuario?.rol_id === ROLES.ADMIN;

  return (
    <div className={styles.page}>
      <PageHeader kicker="Exportaciones" title="Reportes" subtitle="Descarga listados para imprimir o compartir fuera del sistema. Trata los archivos como información interna." />
      {puedeVerSalones && <FormularioReporte tipo="reservas" />}
      <FormularioReporte tipo="tareas" />
    </div>
  );
}
