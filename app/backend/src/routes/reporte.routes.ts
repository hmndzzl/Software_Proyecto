import { Router, Request, Response, NextFunction } from 'express';
import { RowDataPacket } from 'mysql2';
import { rateLimit } from 'express-rate-limit';
import pool from '../config/db';
import { ESTADOS_CUENTA } from '../config/cuentas';
import { ROLES } from '../config/roles';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { exportarReporte } from '../controllers/reporte.controller';

const router = Router();
const limitarDescargas = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user!.id),
  message: { mensaje: 'Demasiadas descargas de reportes. Intenta nuevamente en un minuto.' },
});

interface CuentaRow extends RowDataPacket {
  rol_id: number;
  estado_cuenta: string;
}

// Un JWT emitido antes de una desactivación o cambio de rol no conserva acceso a reportes.
async function verificarCuentaActual(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!Number.isSafeInteger(req.user?.id) || (req.user?.id ?? 0) <= 0) {
    res.status(403).json({ mensaje: 'Acceso denegado' });
    return;
  }
  try {
    const [rows] = await pool.execute<CuentaRow[]>(
      'SELECT rol_id, estado_cuenta FROM persona WHERE id = ?', [req.user!.id],
    );
    if (rows.length === 0 || rows[0].estado_cuenta !== ESTADOS_CUENTA.ACTIVA) {
      res.status(403).json({ mensaje: 'Acceso denegado' });
      return;
    }
    req.user!.rol_id = rows[0].rol_id;
    next();
  } catch (error) {
    console.error('Error al verificar acceso a reportes:', error);
    res.status(500).json({ mensaje: 'No se pudo verificar el acceso al reporte' });
  }
}

router.use(authMiddleware, verificarCuentaActual, limitarDescargas);
router.get('/reservas', requireRole(ROLES.SACERDOTE), exportarReporte('reservas'));
router.get('/tareas', requireRole(ROLES.COORDINADOR_MINISTROS), exportarReporte('tareas'));

export default router;
