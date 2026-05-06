import { RequestHandler } from "express";
import multer from "multer";
import multerS3 from 'multer-s3';
import { initializeS3Client } from "./awsS3.js";
import path from "path";

const s3 = initializeS3Client();

export const multerS3Upload = (
  folder_name: string | null, 
  field_name: string, 
  isMultiple: boolean
): RequestHandler => {

  const storage = multerS3({
    s3,
    bucket: process.env.AWS_BUCKET_NAME!,
    metadata: (req, file, cb) => {
      void req;
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      void req;
      const fileName = `${Date.now()}_${file.originalname}`;
      const key = folder_name ? `${folder_name}/${fileName}` : fileName;
      cb(null, key);
    },
  });

  const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    void req;
    const allowedFileExtensions = ['.pdf', '.docx', '.xlsx', '.jpg', '.jpeg', '.png'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (allowedFileExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Only pdf, docx, xlsx, png, jpeg, and jpg are allowed!'));
    }
  };

  if (isMultiple) {
    console.log("Multiple Upload Running...")
    return multer({ storage, fileFilter }).array(field_name);
  } else {
    console.log("Single Upload Running...", field_name)
    return multer({ storage, fileFilter }).single(field_name);
  }
};
