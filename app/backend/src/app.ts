import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { checkDbConnection } from './config/db'
import authRoutes from './routes/auth.routes'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Conectamos las rutas de autenticación bajo el prefijo /api/auth
app.use('/api/auth', authRoutes)

// Verificamos la conexión a BD al arrancar
checkDbConnection()

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Backend corriendo en puerto ${PORT}`)
})
