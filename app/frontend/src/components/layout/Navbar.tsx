import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { logout } = useAuth();

  return (
    <nav className={styles.nav}>
      <div className={styles.links}>
        <Link to="/dashboard" className={styles.logoLink}>
          <h1 className={styles.logo}>Panel de Control</h1>
        </Link>
        <Link to="/ministros"   className={styles.link}>Ministros</Link>
        <Link to="/tareas"      className={styles.link}>Tareas</Link>
        <Link to="/reservas"    className={styles.link}>Reservas</Link>
        <Link to="/grupos"      className={styles.link}>Grupos</Link>
        <Link to="/espacios"    className={styles.link}>Espacios</Link>
        <Link to="/eventos"     className={styles.link}>Eventos</Link>
        <Link to="/mis-reservas" className={styles.link}>Mis Reservas</Link>
      </div>
      <div className={styles.actions}>
        <Link to="/perfil" className={styles.btnPerfil}>
          Mi Perfil
        </Link>
        <button onClick={logout} className={styles.btnLogout}>
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
}
