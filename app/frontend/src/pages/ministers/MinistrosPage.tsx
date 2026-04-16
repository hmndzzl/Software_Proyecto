import { useEffect, useState } from 'react';

interface Ministro {
  id: number;
  nombre: string;
  correo: string;
}

export default function MinistrosPage() {
  const [ministros, setMinistros] = useState<Ministro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');

    fetch(`${import.meta.env.VITE_API_URL}/api/personas`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Error al obtener ministros');
        return res.json();
      })
      .then((data) => {
        setMinistros(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Cargando ministros...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div className="page-container">
      <div className="content-container">
        <div className="card">
          <h2 className="card-title">Ministros</h2>

          {ministros.length === 0 ? (
            <p>No hay ministros registrados.</p>
          ) : (
            <div className="table-container">
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                  </tr>
                </thead>
                <tbody>
                  {ministros.map((m) => (
                    <tr key={m.id}>
                      <td>{m.nombre}</td>
                      <td>{m.correo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}