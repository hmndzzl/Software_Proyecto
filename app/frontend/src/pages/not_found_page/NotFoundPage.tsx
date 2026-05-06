import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <main style={{
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <section style={{
        maxWidth: '520px',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>404</h1>

        <h2 style={{ marginBottom: '1rem' }}>
          Página no encontrada
        </h2>

        <p style={{ marginBottom: '1.5rem', color: '#666' }}>
          La ruta que intentaste abrir no existe o fue movida.
        </p>

        <Link
          to="/dashboard"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            backgroundColor: '#2563eb',
            color: 'white',
            textDecoration: 'none',
            fontWeight: 600
          }}
        >
          Volver al dashboard
        </Link>
      </section>
    </main>
  );
};

export default NotFoundPage;