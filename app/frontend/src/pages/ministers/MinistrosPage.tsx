import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

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
    apiClient.get('/api/personas')
      .then((res) => {
        setMinistros(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Error al obtener ministros');
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Cargando ministros...</p>;
  if (error) return <p className="error-text">Error: {error}</p>;

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