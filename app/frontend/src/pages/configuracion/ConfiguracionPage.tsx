import { Link } from 'react-router-dom';
import { useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody, CardHead } from '../../components/ui/Card';
import Btn from '../../components/ui/Btn';
import { useToast } from '../../context/ToastContext';
import {
  guardarIntervaloNotificaciones,
  guardarSidebarColapsado,
  guardarTemaAplicacion,
  leerIntervaloNotificaciones,
  leerSidebarColapsado,
  leerTemaAplicacion,
  restaurarPreferenciasUI,
  type IntervaloNotificaciones,
  type TemaAplicacion,
} from '../../auth/sessionStore';
import styles from './ConfiguracionPage.module.css';

export default function ConfiguracionPage() {
  const toast = useToast();
  const [sidebarColapsado, setSidebarColapsado] = useState(leerSidebarColapsado);
  const [intervaloNotificaciones, setIntervaloNotificaciones] = useState<IntervaloNotificaciones>(leerIntervaloNotificaciones);
  const [tema, setTema] = useState<TemaAplicacion>(leerTemaAplicacion);

  const cambiarSidebar = (colapsado: boolean) => {
    setSidebarColapsado(colapsado);
    guardarSidebarColapsado(colapsado);
  };

  const cambiarIntervalo = (intervalo: IntervaloNotificaciones) => {
    setIntervaloNotificaciones(intervalo);
    guardarIntervaloNotificaciones(intervalo);
    toast.success('Preferencia guardada', `Las notificaciones se actualizarán cada ${intervalo === 60 ? 'minuto' : '5 minutos'}.`);
  };

  const cambiarTema = (nuevoTema: TemaAplicacion) => {
    setTema(nuevoTema);
    guardarTemaAplicacion(nuevoTema);
    toast.success('Tema actualizado', `Se aplicó el tema ${nuevoTema}.`);
  };

  const restaurar = () => {
    restaurarPreferenciasUI();
    setSidebarColapsado(false);
    setIntervaloNotificaciones(60);
    setTema('claro');
    toast.success('Preferencias restablecidas', 'Se aplicaron los valores predeterminados de la interfaz.');
  };

  return (
    <div className={styles.page}>
      <PageHeader
        kicker="Preferencias de la aplicación"
        title="Configuración"
        subtitle="Personaliza cómo navegas y recibes información en la plataforma."
      />

      <div className={styles.grid}>
        <Card>
          <CardHead title="Navegación" />
          <CardBody>
            <label className={styles.option}>
              <span>
                <strong>Menú lateral contraído</strong>
                <small>Inicia el área administrativa mostrando solo los iconos del menú en pantallas amplias.</small>
              </span>
              <input
                type="checkbox"
                checked={sidebarColapsado}
                onChange={(event) => cambiarSidebar(event.target.checked)}
                aria-label="Menú lateral contraído"
              />
            </label>
          </CardBody>
        </Card>

        <Card>
          <CardHead title="Notificaciones" />
          <CardBody>
            <fieldset className={styles.fieldset}>
              <legend>Frecuencia de actualización</legend>
              <p className={styles.help}>La campana consulta notificaciones nuevas automáticamente mientras mantienes la plataforma abierta.</p>
              <label className={styles.radioOption}>
                <input type="radio" name="intervalo-notificaciones" checked={intervaloNotificaciones === 60} onChange={() => cambiarIntervalo(60)} />
                Cada minuto
              </label>
              <label className={styles.radioOption}>
                <input type="radio" name="intervalo-notificaciones" checked={intervaloNotificaciones === 300} onChange={() => cambiarIntervalo(300)} />
                Cada 5 minutos
              </label>
            </fieldset>
          </CardBody>
        </Card>

        <Card>
          <CardHead title="Apariencia" />
          <CardBody>
            <fieldset className={styles.fieldset}>
              <legend>Tema de la interfaz</legend>
              <p className={styles.help}>El tema claro conserva la paleta actual; el oscuro usa tonos cálidos de borgoña y oro.</p>
              <label className={styles.radioOption}>
                <input type="radio" name="tema-aplicacion" checked={tema === 'claro'} onChange={() => cambiarTema('claro')} />
                Claro
              </label>
              <label className={styles.radioOption}>
                <input type="radio" name="tema-aplicacion" checked={tema === 'oscuro'} onChange={() => cambiarTema('oscuro')} />
                Oscuro
              </label>
            </fieldset>
          </CardBody>
        </Card>

        <Card>
          <CardHead title="Cuenta" />
          <CardBody>
            <p className={styles.help}>Los datos personales, correo y contraseña se administran desde tu perfil.</p>
            <Link className={styles.profileLink} to="/perfil">Ir a mi perfil</Link>
          </CardBody>
        </Card>
      </div>

      <div className={styles.footerActions}>
        <Btn kind="ghost" onClick={restaurar}>Restablecer preferencias</Btn>
      </div>
    </div>
  );
}
