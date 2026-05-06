import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

import AppError from './appError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const configureEnvironment = () => {
  dotenv.config({ path: join(__dirname, '../.env') });
};

export const createUpload = (allowedFileExtensions: string[], storageType: string, docType: string = 'file') => {
  // Define the fileFilter function based on the provided allowed extensions
  function fileFilter(req: any, file: any, cb: any) {
    // return console.log("File --> ", file);
    void req;
    const fileExtension = extname(file.originalname).toLowerCase();

    if (allowedFileExtensions.includes(fileExtension)) {
      // The file has an allowed extension, accept it
      return cb(null, true);
    }

    // The file has an unallowed extension, reject it
    const error = new AppError("File type not allowed. Only pdf, docx, xlsx, png, jpeg, and jpg are allowed!", 400);
    return cb(error);
  }

  // Define the storage function based on the provide storage type
  let storage;
  if(storageType === "disk") {
    storage = multer.diskStorage({
      destination: function (req, file, cb) {
        void req, file;
        return cb(null, "./uploads/");
      },
      filename: function (req, file, cb) {
        void req;
        return cb(null, `${docType}_${uuidv4()}_${file.originalname}`);
      },
    });
  } else {
    storage = multer.memoryStorage();
  }

  // Configure Multer upload middleware with the provided fileFilter
  const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5000000 }, // Set the file size limit
  });

  return upload;
}