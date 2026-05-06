// import dotenv from "dotenv";

// dotenv.config();

const requiredEnv = [
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "JWT_ACTIVATION_SECRET"
];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

export const ENV = {
  accessSecret: process.env.JWT_ACCESS_SECRET!,
  refreshSecret: process.env.JWT_REFRESH_SECRET!,
  activationSecret: process.env.JWT_ACTIVATION_SECRET!,
  nodeEnv: process.env.NODE_ENV || "development"
};