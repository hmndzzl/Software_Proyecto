import { Router } from 'express';
import { getAgendaPublica } from '../controllers/agendaPublica.controller';
import { getContenidoLanding } from '../controllers/landing.controller';

const router = Router();
// La landing consulta esta ruta sin sesión. Las rutas administrativas siguen protegidas.
router.get('/agenda', getAgendaPublica);
router.get('/landing', getContenidoLanding);

export default router;
