import { Router } from 'express';
import { getAgendaPublica } from '../controllers/agendaPublica.controller';

const router = Router();
// La landing consulta esta ruta sin sesión. Las rutas administrativas siguen protegidas.
router.get('/agenda', getAgendaPublica);

export default router;
