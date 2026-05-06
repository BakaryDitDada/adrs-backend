import mongoose from 'mongoose';
// import logger from '../utils/logger.js'

const MONGODB_URI = process.env.REMOTE_MONGODB_URI || process.env.LOCAL_MONGODB_URI || '';

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
    console.log('✅ MongoDB URI', MONGODB_URI.replace(/(mongodb:\/\/.*:).*@/, '$1****@')); // Mask password in logs
    
    // Connection events
    mongoose.connection.on('error', (error) => {
      console.error(`❌ MongoDB connection error: ${error.message}`);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
    
    // Close connection on app termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.info('MongoDB connection closed through app termination');
      process.exit(0);
    });
    
  } catch (error: any) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');
  } catch (error: any) {
    console.error(`❌ MongoDB disconnection failed: ${error.message}`);
    throw error;
  }
};