import { Router } from 'express';
import { ESPACIOS_MEDIA_DIR } from '../services/espacioFoto.service';
import express from 'express';

const router = Router();
const espaciosDir = ESPACIOS_MEDIA_DIR;

// Solo se publica el directorio de fotografías optimizadas, sin acceso a los JPG originales.
router.use('/espacios', (req, res, next) => {
  if (!/^\/(?:subidas\/)?[a-z0-9-]+\.webp$/.test(req.path)) {
    res.sendStatus(404);
    return;
  }
  next();
});
router.use('/espacios', express.static(espaciosDir, {
  dotfiles: 'deny',
  index: false,
  immutable: true,
  maxAge: '30d',
}));

export default router;
