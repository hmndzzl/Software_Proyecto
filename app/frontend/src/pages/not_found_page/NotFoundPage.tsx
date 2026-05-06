import { Link } from 'react-router-dom';
import './NotFoundPage.css';

const NotFoundPage = () => {
  return (
    <main className="not-found-page">
      <section className="not-found-card">
        <p className="not-found-label">Error 404</p>

        <h1 className="not-found-title">Página no encontrada</h1>

        <p className="not-found-text">
          La ruta que intentaste abrir no existe o fue movida.
        </p>

        <Link to="/dashboard" className="not-found-button">
          Volver al dashboard
        </Link>
      </section>
    </main>
  );
};

export default NotFoundPage;