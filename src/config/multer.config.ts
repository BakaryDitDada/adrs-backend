import multer from 'multer';
// import { v4 as uuidv4 } from 'uuid';
import AppError from '../utils/appError.js';

const allowedMimeTypes = [
  'image/jpeg', 'image/png', 'image/gif',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const fileFilter = (_: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Unsupported file type', 400));
  }
};

const storage = multer.memoryStorage(); // store in memory, then pass to storage service

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const uploadSingle: any = (fieldName: string) => upload.single(fieldName);
export const uploadMultiple: any = (fieldName: string, maxCount: number = 10) => upload.array(fieldName, maxCount);