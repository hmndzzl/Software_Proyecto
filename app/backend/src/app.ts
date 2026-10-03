import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { checkDbConnection } from './config/db';
import { validateEnv, getAllowedOrigins } from './config/env';
import authRoutes from './routes/auth.routes';
import tareaRoutes from './routes/tarea.routes';
import personaRoutes from './routes/persona.routes';
import reservaRoutes from './routes/reserva.routes';
import espacioRoutes from './routes/espacio.routes';
import grupoRoutes from './routes/grupo.routes';
import eventoRoutes from './routes/evento.routes';
import notificacionRoutes from './routes/notificacion.routes';
import cambioTurnoRoutes from './routes/cambioTurno.routes';
import ausenciaRoutes from './routes/ausencia.routes';
import contactoRoutes from './routes/contacto.routes';

dotenv.config();
validateEnv();

export const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = getAllowedOrigins();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  strictTransportSecurity: isProduction ? undefined : false,
}));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 24 * 60 * 60,
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
app.use('/api/cambios-turno', cambioTurnoRoutes);
app.use('/api/ausencias', ausenciaRoutes);
app.use('/api/contacto', contactoRoutes);

// Ruta de salud para verificar que el backend está funcionando
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Verificamos la conexión a BD al arrancar
export function startServer() {
  checkDbConnection();

  return app.listen(PORT, () => {
    console.log(`Backend corriendo en puerto ${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}
