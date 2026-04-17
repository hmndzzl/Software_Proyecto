import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  return (
    <nav style={{ backgroundColor: '#fff', padding: '16px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Panel de Control</h1>
        <Link to="/ministros" style={{ textDecoration: 'none', color: '#555', fontWeight: 600, fontSize: '14px' }}>Ministros</Link>
        <Link to="/tareas" style={{ textDecoration: 'none', color: '#555', fontWeight: 600, fontSize: '14px' }}>Tareas</Link>
        <Link to="/reservas" style={{ textDecoration: 'none', color: '#555', fontWeight: 600, fontSize: '14px' }}>Reservas</Link>
        <Link to="/espacios" style={{ textDecoration: 'none', color: '#555', fontWeight: 600, fontSize: '14px' }}>Espacios</Link>
      </div>
      <div>
        <button 
          onClick={handleLogout}
          style={{ backgroundColor: 'transparent', border: '1px solid #ccc', borderRadius: '50px', padding: '8px 16px', fontWeight: 600, cursor: 'pointer', color: '#333' }}
        >
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
}
