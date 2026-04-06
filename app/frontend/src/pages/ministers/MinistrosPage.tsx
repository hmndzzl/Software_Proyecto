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

    fetch('http://localhost:3001/api/personas', {
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
    <div style={{ padding: '20px' }}>
      <h2>Ministros</h2>

      {ministros.length === 0 ? (
        <p>No hay ministros registrados.</p>
      ) : (
        <ul>
          {ministros.map((m) => (
            <li key={m.id}>
              {m.nombre} - {m.correo}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}