import { useEffect, useState, type ReactNode } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import { leerSidebarColapsado, guardarSidebarColapsado, UI_PREFERENCES_EVENT } from '../../auth/sessionStore';
import styles from './AppShell.module.css';

export default function AppShell({ children }: { children: ReactNode }) {
  const [colapsado, setColapsado] = useState(leerSidebarColapsado);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  useEffect(() => {
    const sincronizarPreferencias = () => setColapsado(leerSidebarColapsado());
    window.addEventListener(UI_PREFERENCES_EVENT, sincronizarPreferencias);
    return () => window.removeEventListener(UI_PREFERENCES_EVENT, sincronizarPreferencias);
  }, []);

  const alternarColapsado = () => {
    setColapsado((prev) => {
      const siguiente = !prev;
      guardarSidebarColapsado(siguiente);
      return siguiente;
    });
  };

  const cerrarMenuMovil = () => setMenuMovilAbierto(false);

  const alternarMenu = () => {
    if (menuMovilAbierto) {
      cerrarMenuMovil();
    } else {
      alternarColapsado();
    }
  };

  return (
    <div className={styles.shell}>
      <div className={`${styles.sidebar}${colapsado ? ` ${styles.sidebarColapsado}` : ''}${menuMovilAbierto ? ` ${styles.sidebarAbierta}` : ''}`}>
        <Sidebar colapsado={menuMovilAbierto ? false : colapsado} onAlternar={alternarMenu} onNavegar={cerrarMenuMovil} />
      </div>
      {menuMovilAbierto && <button type="button" className={styles.backdrop} aria-label="Cerrar menú" onClick={cerrarMenuMovil} />}
      <div className={styles.main}>
        <TopBar onAbrirMenu={() => setMenuMovilAbierto(true)} />
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
