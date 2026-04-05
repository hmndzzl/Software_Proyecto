import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { checkDbConnection } from './config/db'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Verificamos la conexión a BD al arrancar
checkDbConnection()

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Backend corriendo en puerto ${PORT}`)
})
