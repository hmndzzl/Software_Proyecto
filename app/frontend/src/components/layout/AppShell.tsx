import { useState, type ReactNode } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import { leerSidebarColapsado, guardarSidebarColapsado } from '../../auth/sessionStore';
import styles from './AppShell.module.css';

export default function AppShell({ children }: { children: ReactNode }) {
  const [colapsado, setColapsado] = useState(leerSidebarColapsado);

  const alternarColapsado = () => {
    setColapsado((prev) => {
      const siguiente = !prev;
      guardarSidebarColapsado(siguiente);
      return siguiente;
    });
  };

  return (
    <div className={styles.shell}>
      <div className={`${styles.sidebar}${colapsado ? ` ${styles.sidebarColapsado}` : ''}`}>
        <Sidebar colapsado={colapsado} onAlternar={alternarColapsado} />
      </div>
      <div className={styles.main}>
        <TopBar />
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
