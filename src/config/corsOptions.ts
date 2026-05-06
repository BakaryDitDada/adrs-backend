import { allowedOrigins } from "./allowedOrigins.js";

// export const corsOptions = {
//   origin: process.env.ALLOWED_ORIGINS?.split(','),
//   credentials: true
// };

export const corsOptions = {
  origin: (origin: any, cb: any) => {
    if(allowedOrigins.indexOf(origin) !== -1) {
      cb(null, true);
    } else {
      cb(new Error(`Not allowed by CORS Policy`));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
  optionsSuccessStatus: 200,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}