import { Router } from 'express';
import {
  getTareas,
  getTareaById,
  createTarea,
  updateTarea,
  deleteTarea,
  asignarTarea,
  desasignarTarea,
} from '../controllers/tarea.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas de tareas requieren autenticación JWT
router.use(authMiddleware);

// Manejo de asignación 
// nota: /asignar debe ir antes de /:id para que Express no confunda
// la cadena "asignar" con un parámetro numérico de id
router.post('/asignar', asignarTarea);
router.delete('/asignar', desasignarTarea);

//CRUD para tareas
router.get('/', getTareas);
router.get('/:id', getTareaById);
router.post('/', createTarea);
router.put('/:id', updateTarea);
router.delete('/:id', deleteTarea);

export default router;