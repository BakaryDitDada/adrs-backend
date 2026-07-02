import "./init-patch.js";
import "dotenv/config.js";

import app from "./app.js";
import mongoose from "mongoose";
import { connectDB } from "./config/database.js";
import logger from "./utils/logger.js";

const PORT = process.env.PORT || 5000;

let server: any = null;

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    server = app.listen(PORT, () => {
      console.info(`🚀 Server running on http://localhost:${PORT}`);
      console.info(`📁 Environment: ${process.env.NODE_ENV}`);
      console.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.info(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
    });
  } catch (error: any) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  } 
};

const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed.');
    });
  }

  // Close DB connection
  await mongoose.connection.close();

  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the application
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default server;