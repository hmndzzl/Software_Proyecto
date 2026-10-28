import { Router } from 'express';
import { ESPACIOS_MEDIA_DIR } from '../services/espacioFoto.service';
import { LANDING_MEDIA_DIR } from '../services/landingImagen.service';
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

// Fotos de la landing: las incluidas en el despliegue y las subidas desde el panel de contenido público.
router.use('/landing', (req, res, next) => {
  if (!/^\/(?:subidas\/)?[a-z0-9-]+\.webp$/.test(req.path)) {
    res.sendStatus(404);
    return;
  }
  next();
});
router.use('/landing', express.static(LANDING_MEDIA_DIR, {
  dotfiles: 'deny',
  index: false,
  immutable: true,
  maxAge: '30d',
}));

export default router;
