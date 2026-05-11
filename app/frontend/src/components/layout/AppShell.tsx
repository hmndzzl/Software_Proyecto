import type { ReactNode } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import styles from './AppShell.module.css';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <div className={styles.sidebar}>
        <Sidebar />
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
