import { useState, useEffect } from 'react';

interface Espacio {
  id: number;
  nombre: string;
  capacidad: number | null;
}

export default function CrearReservaForm({ onReservaCreada }: { onReservaCreada?: () => void }) {
  const [fecha, setFecha] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [espacioId, setEspacioId] = useState('');
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEspacios = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/espacios`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setEspacios(data);
        }
      } catch {
        // silencioso, el select quedará vacío
      }
    };
    fetchEspacios();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fecha || !horaInicio || !horaFin || !espacioId) {
      setMensaje('Por favor completa todos los campos.');
      return;
    }

    if (horaInicio >= horaFin) {
      setMensaje('La hora de inicio debe ser menor que la hora de fin.');
      return;
    }

    setLoading(true);
    setMensaje('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reservas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fecha,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          espacio_id: Number(espacioId)
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMensaje('¡Solicitud de reserva enviada para aprobación!');
        setFecha('');
        setHoraInicio('');
        setHoraFin('');
        setEspacioId('');
        if (onReservaCreada) onReservaCreada();
      } else {
        setMensaje(data.message || 'Error al crear la reserva.');
      }
    } catch {
      setMensaje('Error de red al intentar crear la reserva.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: '16px' }}>Solicitar Reserva</h3>

      {mensaje && (
        <p
          className={mensaje.includes('aprobación') ? '' : 'error-text'}
          style={{
            color: mensaje.includes('aprobación') ? '#2e7d32' : undefined,
            marginBottom: '16px',
            fontWeight: 600
          }}
        >
          {mensaje}
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div className="input-wrapper" style={{ marginBottom: '0' }}>
          <label htmlFor="espacio_id" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
            Espacio:
          </label>
          <select
            id="espacio_id"
            className="login-input"
            value={espacioId}
            onChange={(e) => setEspacioId(e.target.value)}
            style={{ paddingLeft: '14px', cursor: 'pointer' }}
          >
            <option value="">-- Selecciona un espacio --</option>
            {espacios.map((esp) => (
              <option key={esp.id} value={esp.id}>
                {esp.nombre}{esp.capacidad ? ` (cap. ${esp.capacidad})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="input-wrapper" style={{ marginBottom: '0' }}>
          <label htmlFor="fecha" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
            Fecha:
          </label>
          <input
            type="date"
            id="fecha"
            className="login-input"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            style={{ paddingLeft: '14px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <div className="input-wrapper" style={{ marginBottom: '0', flex: 1 }}>
            <label htmlFor="hora_inicio" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
              Hora de Inicio:
            </label>
            <input
              type="time"
              id="hora_inicio"
              className="login-input"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              style={{ paddingLeft: '14px' }}
            />
          </div>

          <div className="input-wrapper" style={{ marginBottom: '0', flex: 1 }}>
            <label htmlFor="hora_fin" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
              Hora de Fin:
            </label>
            <input
              type="time"
              id="hora_fin"
              className="login-input"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              style={{ paddingLeft: '14px' }}
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" style={{ marginTop: '16px' }} disabled={loading}>
          {loading ? 'Enviando...' : 'Solicitar Reserva'}
        </button>
      </form>
    </div>
  );
}
