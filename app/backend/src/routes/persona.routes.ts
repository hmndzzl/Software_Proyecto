import { Router } from 'express';
import {
  getMinistros,
  getCoordinadoresGrupo,
  getEncargadosEvento,
  getPersonaById,
  editarPerfil,
  actualizarDisponibilidad,
} from '../controllers/persona.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';
import { ROLES } from '../config/roles';

const router = Router();

router.use(authMiddleware);

// Rutas específicas ANTES de /:id para que Express no las confunda con parámetros
router.get('/coordinadores-grupo', requireRole(ROLES.COORDINADOR_GRUPOS), getCoordinadoresGrupo);
router.get('/encargados-evento', requireRole(ROLES.SACERDOTE), getEncargadosEvento);
router.get('/', requireRole(ROLES.COORDINADOR_MINISTROS), getMinistros);

// Rutas con parámetro de id
router.get('/:id', (req, res, next) => {
  const rolesConAcceso: number[] = [ROLES.SACERDOTE, ROLES.COORDINADOR_MINISTROS, ROLES.COORDINADOR_GRUPOS, ROLES.ADMIN];
  const puedeConsultarTerceros = rolesConAcceso.includes(req.user!.rol_id);
  if (!puedeConsultarTerceros && req.user!.id !== Number(req.params.id)) {
    res.status(403).json({ mensaje: 'Acceso denegado: permisos insuficientes' });
    return;
  }
  next();
}, getPersonaById);
router.put('/:id', editarPerfil);
// requireRole(COORDINADOR_MINISTROS) también permite Sacerdote/Admin por jerarquía (ver auth.middleware)
router.patch('/:id/disponibilidad', requireRole(ROLES.COORDINADOR_MINISTROS), actualizarDisponibilidad);

export default router;
