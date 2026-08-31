import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Creamos un pool de conexiones.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'test',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Las columnas DATE se devuelven como 'YYYY-MM-DD' en vez de Date. Si no,
  // mysql2 las convierte usando la zona horaria del servidor y al serializar a
  // JSON (UTC) la fecha podia correrse un dia en el calendario.
  dateStrings: ['DATE']
});

// Función de prueba para verificar la conexión inicial
export const checkDbConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Conexión a la base de datos MariaDB exitosa.');
    connection.release();
  } catch (error) {
    console.error('Error conectando a la base de datos:', error);
  }
};

export default pool;
