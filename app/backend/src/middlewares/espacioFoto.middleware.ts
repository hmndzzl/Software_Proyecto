import { RequestHandler } from 'express';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 3, parts: 4, fieldSize: 1024 },
  fileFilter: (_req, file, cb) => {
    const extensiones: Record<string, RegExp> = {
      'image/jpeg': /\.jpe?g$/i, 'image/png': /\.png$/i, 'image/webp': /\.webp$/i,
    };
    if (!extensiones[file.mimetype]?.test(file.originalname)) return cb(new Error('Formato de imagen no permitido'));
    cb(null, true);
  },
}).single('imagen');

export const recibirFotoEspacio: RequestHandler = (req, res, next) => {
  upload(req, res, error => {
    if (!error) return next();
    res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
      message: error.code === 'LIMIT_FILE_SIZE' ? 'La imagen no puede superar 10 MB' : 'Envía una sola imagen JPEG, PNG o WebP válida y los campos del formulario',
    });
  });
};
