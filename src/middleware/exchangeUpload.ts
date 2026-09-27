import multer from 'multer';
import { AppError } from '../utils/AppError';

export const exchangeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new AppError(422, 'INVALID_FILE_TYPE', 'Only image files are allowed for images'));
    }
    cb(null, true);
  },
}).fields([{ name: 'images', maxCount: 5 }]);
