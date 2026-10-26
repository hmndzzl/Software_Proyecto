import { Router } from 'express';
import path from 'node:path';
import express from 'express';

const router = Router();
const espaciosDir = path.resolve(__dirname, '../../media/espacios');

// Solo se publica el directorio de fotografías optimizadas, sin acceso a los JPG originales.
router.use('/espacios', (req, res, next) => {
  if (!/^\/[a-z0-9-]+\.webp$/.test(req.path)) {
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
