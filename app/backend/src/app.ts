import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { checkDbConnection } from './config/db';
import authRoutes from './routes/auth.routes';
import tareaRoutes from './routes/tarea.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Rutas 
app.use('/api/auth', authRoutes);
app.use('/api/tareas', tareaRoutes);

// Ruta de salud para verificar que el backend está funcionando
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Verificamos la conexión a BD al arrancar
checkDbConnection();

app.listen(PORT, () => {
  console.log(`Backend corriendo en puerto ${PORT}`);
});