import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import morgan from "morgan";

import { registerRoutes } from "./routes/index.js";
import globalErrorHandler from "./utils/errorHandler.js";
import './jobs/payrollReminder.js';
import './jobs/authCleanup.job.js';
import './jobs/docsCleanup.job.js';

const app: express.Application = express();

/**
 * 1. PROXY TRUST (Crucial for Enterprise Deployments)
 * Tells Express to trust the X-Forwarded-For and X-Forwarded-Proto headers
 * sent by Nginx, Cloudflare, or AWS ELB. Essential for cookie/credential validation.
 */
app.set('trust proxy', 1);

/**
 * 2. DYNAMIC CORS CONFIGURATION
 * Instead of hardcoding arrays, pull from an environment variable.
 * Provide an absolute fallback for development safety.
 */
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:5173"]; // Added default Vite port too

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server requests or tools like Postman (which don't send an Origin header)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS Policy Violation: Origin ${origin} is not allowed.`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "X-XSRF-TOKEN"],
  optionsSuccessStatus: 200 // Explicitly forces legacy browsers (IE11) to behave on 204 options
};

// 3. APPLY MIDDLEWARES (Corrected Order & Parameters)
app.use(helmet({
  // Relaxes Helmet's resource policy so your frontend can safely parse cross-origin elements
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Apply CORS to all routes
app.use(cors(corsOptions));

// Explicitly handle pre-flight OPTIONS requests globally across all routes
app.options("*", cors(corsOptions));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
registerRoutes(app);

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
        body { font-family: Arial, sans-serif; background: #f4f6f8; color: #2c3e50; text-align: center; padding: 50px; }
        h1 { color: #1abc9c; font-size: 2.5em; }
        p { font-size: 1.2em; margin: 10px 0; }
        .links { margin-top: 20px; }
        a { display: inline-block; margin: 5px 10px; padding: 10px 15px; background: #1abc9c; color: white; text-decoration: none; border-radius: 5px; transition: background 0.3s; }
        a:hover { background: #16a085; }
      </style>
    </head>
    <body>
      <h1>🚀 ADRS API is Running...</h1>
      <p>Welcome to the ADRS backend service.</p>
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

// 404 Fallback Handler
app.use((_, res) => { 
  res.status(404).json({ 
    status: "Echec", 
    message: "Ce lien (API Route) est inexistante pour le moment, veuillez vérifier !!!" 
  }); 
});

// Global Error Handler
app.use(globalErrorHandler);

export default app;