import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { checkDbConnection } from './config/db';
import authRoutes from './routes/auth.routes';
import tareaRoutes from './routes/tarea.routes';
import personaRoutes from './routes/persona.routes';
import reservaRoutes from './routes/reserva.routes';
import espacioRoutes from './routes/espacio.routes';
import grupoRoutes from './routes/grupo.routes';
import eventoRoutes from './routes/evento.routes';
import notificacionRoutes from './routes/notificacion.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
];

if (process.env.CORS_ORIGIN) {
  allowedOrigins.push(process.env.CORS_ORIGIN);
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
}));


app.use(express.json());
app.use(cookieParser());

// Rutas 
app.use('/api/auth', authRoutes);
app.use('/api/tareas', tareaRoutes);
app.use('/api/personas', personaRoutes);
app.use('/api/reservas', reservaRoutes);
app.use('/api/espacios', espacioRoutes);
app.use('/api/grupos', grupoRoutes);
app.use('/api/eventos', eventoRoutes);
app.use('/api/notificaciones', notificacionRoutes);

// Ruta de salud para verificar que el backend está funcionando
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Verificamos la conexión a BD al arrancar
checkDbConnection();

app.listen(PORT, () => {
  console.log(`Backend corriendo en puerto ${PORT}`);
});
