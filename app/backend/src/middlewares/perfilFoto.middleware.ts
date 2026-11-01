import type { RequestHandler } from 'express';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0, parts: 2 },
  fileFilter: (_req, file, cb) => {
    const extensiones: Record<string, RegExp> = { 'image/jpeg': /\.jpe?g$/i, 'image/png': /\.png$/i, 'image/webp': /\.webp$/i };
    if (!extensiones[file.mimetype]?.test(file.originalname)) return cb(new Error('Formato no admitido'));
    cb(null, true);
  },
}).single('imagen');

export const recibirFotoPerfil: RequestHandler = (req, res, next) => {
  upload(req, res, error => {
    if (!error) return next();
    res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
      mensaje: error.code === 'LIMIT_FILE_SIZE' ? 'La foto no puede superar 10 MB' : 'Envía una sola imagen JPEG, PNG o WebP válida',
    });
  });
};
