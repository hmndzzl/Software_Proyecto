import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import PDFDocument from 'pdfkit';
import pool from '../config/db';

type TipoReporte = 'reservas' | 'tareas';
const MAX_FILAS = 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

interface ReservaRow extends RowDataPacket {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  espacio: string | null;
  evento: string | null;
  estado: string;
  solicitante: string;
}

interface TareaRow extends RowDataPacket {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  titulo: string;
  asignado: string | null;
}

const CONSULTAS: Record<TipoReporte, string> = {
  reservas: `SELECT r.id, r.fecha, r.hora_inicio, r.hora_fin,
      e.nombre AS espacio, ev.titulo AS evento, er.detalle AS estado, p.nombre AS solicitante
    FROM reserva r
    LEFT JOIN espacio e ON e.id = r.espacio_id
    LEFT JOIN evento ev ON ev.reserva_id = r.id
    JOIN estado_reserva er ON er.id = r.estado_reserva_id
    JOIN persona p ON p.id = r.solicitante_id
    WHERE r.fecha BETWEEN ? AND ?
    ORDER BY r.fecha, r.hora_inicio, r.id
    LIMIT ?`,
  tareas: `SELECT t.id, t.fecha, t.hora_inicio, t.hora_fin, t.titulo,
      p.nombre AS asignado
    FROM tarea t
    LEFT JOIN asignacion_tarea a ON a.tarea_id = t.id
    LEFT JOIN persona p ON p.id = a.persona_id
    WHERE t.fecha BETWEEN ? AND ?
    ORDER BY t.fecha, t.hora_inicio, t.id, p.nombre
    LIMIT ?`,
};

const COLUMNAS: Record<TipoReporte, string[]> = {
  reservas: ['ID', 'Fecha', 'Inicio', 'Fin', 'Salón', 'Evento', 'Estado', 'Solicitante'],
  tareas: ['ID', 'Fecha', 'Inicio', 'Fin', 'Tarea', 'Asignado a'],
};

function fechaValida(valor: unknown): Date | null {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor ? fecha : null;
}

function valores(row: ReservaRow | TareaRow, tipo: TipoReporte): unknown[] {
  if (tipo === 'reservas') {
    const r = row as ReservaRow;
    return [r.id, r.fecha, r.hora_inicio, r.hora_fin, r.espacio ?? 'Sin salón', r.evento ?? '', r.estado, r.solicitante];
  }
  const t = row as TareaRow;
  return [t.id, t.fecha, t.hora_inicio, t.hora_fin, t.titulo, t.asignado ?? 'Sin asignar'];
}

function celdaCsv(valor: unknown): string {
  const limpio = String(valor ?? '').replace(/[\r\n\t\u0000-\u001f\u007f]/g, ' ');
  // La tabulación inicial dentro de las comillas mitiga la ejecución de fórmulas en hojas de cálculo.
  const seguro = /^\s*[=+\-@]/u.test(limpio) ? `\t${limpio}` : limpio;
  return `"${seguro.replace(/"/g, '""')}"`;
}

function enviarPdf(res: Response, tipo: TipoReporte, desde: string, hasta: string, filas: (ReservaRow | TareaRow)[]): void {
  const pdf = new PDFDocument({ size: 'A4', margin: 42, info: { Title: `Reporte de ${tipo}` } });
  pdf.on('error', (error) => {
    console.error('Error al generar PDF:', error);
    if (!res.headersSent) res.status(500).end();
    else res.destroy(error);
  });
  pdf.pipe(res);
  pdf.fontSize(17).text(tipo === 'reservas' ? 'Reporte de reservas de salones' : 'Reporte de tareas y asignaciones');
  pdf.moveDown(0.4).fontSize(10).text(`Periodo: ${desde} al ${hasta}  |  Registros: ${filas.length}`);
  pdf.moveDown(0.8);
  if (filas.length === 0) pdf.text('No hay registros en el periodo seleccionado.');
  for (const fila of filas) {
    const datos = valores(fila, tipo);
    // Cada registro usa únicamente las columnas permitidas; PDFKit ajusta el texto y crea páginas.
    pdf.fontSize(9).text(COLUMNAS[tipo].map((col, i) => `${col}: ${String(datos[i] ?? '')}`).join('   |   '), {
      width: 510,
      paragraphGap: 7,
    });
  }
  pdf.end();
}

export function exportarReporte(tipo: TipoReporte) {
  return async (req: Request, res: Response): Promise<void> => {
    const { desde, hasta, formato } = req.query;
    const inicio = fechaValida(desde);
    const fin = fechaValida(hasta);
    const limiteDias = tipo === 'reservas' ? 366 : 31;
    if (!inicio || !fin || (formato !== 'csv' && formato !== 'pdf') ||
        fin < inicio || (fin.getTime() - inicio.getTime()) / DIA_MS + 1 > limiteDias) {
      res.status(400).json({ mensaje: `Indica fechas válidas (máximo ${limiteDias} días) y formato csv o pdf` });
      return;
    }

    try {
      const [resultado] = await pool.execute<RowDataPacket[]>(CONSULTAS[tipo], [desde as string, hasta as string, MAX_FILAS + 1]);
      const filas = resultado as (ReservaRow | TareaRow)[];
      if (filas.length > MAX_FILAS) {
        res.status(413).json({ mensaje: 'El reporte supera 1000 filas. Reduce el periodo.' });
        return;
      }
      const nombre = `reporte-${tipo}-${desde}-${hasta}.${formato}`;
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
      res.setHeader('Content-Type', formato === 'csv' ? 'text/csv; charset=utf-8' : 'application/pdf');
      if (formato === 'csv') {
        const lineas = [COLUMNAS[tipo], ...filas.map((fila) => valores(fila, tipo))];
        res.send(`\uFEFF${lineas.map((linea) => linea.map(celdaCsv).join(',')).join('\r\n')}\r\n`);
      } else {
        enviarPdf(res, tipo, desde as string, hasta as string, filas);
      }
    } catch (error) {
      console.error('Error al exportar reporte:', error);
      if (!res.headersSent) res.status(500).json({ mensaje: 'No se pudo generar el reporte' });
      else res.destroy(error as Error);
    }
  };
}
