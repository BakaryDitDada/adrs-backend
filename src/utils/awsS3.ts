import { S3Client } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// 1. First try loading from project root
let envPath = path.resolve(process.cwd(), 'config.env');

// 2. Fallback to dist folder if needed
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(process.cwd(), 'dist/config.env');
}

// 3. Final fallback to src for development
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(process.cwd(), 'src/config.env');
}

dotenv.config({ path: envPath });

export const initializeS3Client = (): S3Client => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    region: process.env.AWS_REGION!,
  });
  return s3;
}