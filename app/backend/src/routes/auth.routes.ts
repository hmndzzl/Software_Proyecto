import { Router } from 'express';
import { login, register } from '../controllers/auth.controller';

// Instanciamos el Enrutador de Express
const router = Router();

router.post('/login', login);

router.post('/register', register);


export default router;
