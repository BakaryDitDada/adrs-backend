// import dotenv from "dotenv";
// dotenv.config();

import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import morgan from "morgan";
import { registerRoutes } from "./routes/index.js";
import globalErrorHandler from "./utils/errorHandler.js";
import './jobs/payrollReminder.js'; // Import the payroll reminder job to ensure it runs
import './jobs/authCleanup.job.js'; // Import the auth cleanup job to ensure it runs
import './jobs/docsCleanup.job.js'; // Import the documents cleanup job to ensure it runs

// import logger from './utils/logger.js';
// import userRouter from "./routes/userRoutes.js";
// import taskRouter from "./routes/taskRoutes.js";
// import employeeRouter from "./routes/employeeRoutes.js";
// import payrollRouter from "./routes/payrollRoutes.js";
// import leaveRouter from "./routes/leaveRoutes.js";
// import projectRouter from "./routes/projectRoutes.js";
// import { corsOptions } from "./config/corsOptions.js";
// import { credentials } from "./middlewares/credentials.js";

// Mount routers
// const apiVersion = '/api/v1';

// Define API paths
// const apiUserPath = `${apiVersion}/users`;
// const apiTaskPath = `${apiVersion}/tasks`;
// const apiProjectPath = `${apiVersion}/projects`;
// const apiEmployeePath = `${apiVersion}/employees`;
// const apiPayrollPath = `${apiVersion}/payrolls`;
// const apiLeavePath = `${apiVersion}/leaves`; // For future leave management routes

const app: express.Application = express();

// Middlewares
app.use(helmet());
// app.use(cors(corsOptions)); // Apply CORS with custom options
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://adrs-mali.com'] 
    : ['http://localhost:3000'],
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// app.use(credentials);

// CORS POLICY SETTINGS
// app.use(cors(corsOptions)); // Apply to ALL routes
// app.options('*', cors(corsOptions)); // Important for upload endpoints

// Use Morgan - Third Party Middleware
if(process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
registerRoutes(app);
// app.use(apiUserPath, userRouter);
// app.use(apiTaskPath, taskRouter);
// app.use(apiProjectPath, projectRouter);
// app.use(apiEmployeePath, employeeRouter);
// app.use(apiPayrollPath, payrollRouter);
// app.use(apiLeavePath, leaveRouter); // For leave management

// Health check endpoint
app.get('/api/health', (req, res) => {
  void req;
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'ADRS Backend',
    version: '1.0.0'
  });
});

// Basic route for testing
app.get('/api/test', (req, res) => {
  void req;
  res.json({ 
    message: '✅ Backend is working!',
    environment: process.env.NODE_ENV,
    nodeVersion: process.version
  });
});

app.get('/whats-my-ip', (req, res) => {
  res.send(`Your IP: ${req.ip}\nProxied: ${req.ips}`);
});

// API HOME PAGE
app.get('/', (_, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>ADRS API</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background: #f4f6f8;
          color: #2c3e50;
          text-align: center;
          padding: 50px;
        }
        h1 {
          color: #1abc9c;
          font-size: 2.5em;
        }
        p {
          font-size: 1.2em;
          margin: 10px 0;
        }
        .links {
          margin-top: 20px;
        }
        a {
          display: inline-block;
          margin: 5px 10px;
          padding: 10px 15px;
          background: #1abc9c;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          transition: background 0.3s;
        }
        a:hover {
          background: #16a085;
        }
      </style>
    </head>
    <body>
      <h1>🚀 ADRS API is Running...</h1>
      <p>Welcome to the ADRS backend service.</p>
      <p>Use the links below to explore endpoints and documentation.</p>
      <div class="links">
        <a href="/api/v1/users">Users Endpoint</a>
        <a href="/api/v1/docs">API Documentation</a>
        <a href="/api/v1/health">Health Check</a>
      </div>
      <footer style="margin-top:40px; font-size:0.9em; color:#7f8c8d;">
        &copy; ${new Date().getFullYear()} ADRS Project — All rights reserved.
      </footer>
    </body>
    </html>
  `);
});

// ERROR HANDLERS
app.use((_, res) => { 
  res.status(404).json({ 
    status: "Echec", 
    message: "Ce lien (API Route) est inexistante pour le moment, veuillez vérifier !!!" 
  }); 
});

app.use(globalErrorHandler);

export default app;