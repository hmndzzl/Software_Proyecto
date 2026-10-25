import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { MariaDbContainer } from '@testcontainers/mariadb';

/** Base aislada: nunca se conecta a los datos habituales de desarrollo. */
export async function iniciarParroquiaPrueba() {
  const container = await new MariaDbContainer('mariadb:11')
    .withDatabase('parroquia_test').withUsername('parroquia')
    .withUserPassword('parroquia_test').withRootPassword('root_test').start();
  Object.assign(process.env, {
    NODE_ENV: 'test', DB_HOST: container.getHost(), DB_PORT: String(container.getPort()),
    DB_USER: container.getUsername(), DB_PASSWORD: container.getUserPassword(), DB_NAME: container.getDatabase(),
  });
  try {
    const connection = await mysql.createConnection({
      host: container.getHost(), port: container.getPort(), user: container.getUsername(),
      password: container.getUserPassword(), database: container.getDatabase(), multipleStatements: true,
    });
    try {
      for (const file of ['01_schema.sql', '02_seeds.sql', '03_landing.sql']) {
        await connection.query(fs.readFileSync(path.resolve(__dirname, '../../../database/init', file), 'utf8'));
      }
    } finally { await connection.end(); }
    vi.resetModules();
    const { app } = await import('../../src/app');
    const { default: pool } = await import('../../src/config/db');
    return { app, pool, cerrar: async () => { await pool.end(); await container.stop(); } };
  } catch (error) { await container.stop(); throw error; }
}
