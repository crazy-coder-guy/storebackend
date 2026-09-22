import multer from 'multer';
import { AppError } from '../utils/AppError';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new AppError(422, 'INVALID_FILE_TYPE', 'Only image files are allowed'));
    }
    cb(null, true);
  },
});
