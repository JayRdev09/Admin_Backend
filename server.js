// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const userRoutes = require('./routes/user.routes');
const systemRoutes = require('./routes/system.routes');
const configRoutes = require('./routes/config.routes');

const app = express();

// CORS configuration for production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8000',
  'https://admin-backend-zh2f.onrender.com',
  'https://tomato-ai-admin-frontend.onrender.com',
  'https://*.onrender.com'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Allow any render.com subdomain
    if (origin.match(/https:\/\/.*\.onrender\.com$/)) {
      return callback(null, true);
    }
    
    console.log('CORS blocked origin:', origin);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Handle preflight requests
app.options('*', cors());

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ==================== ROOT ROUTE ====================
app.get('/', (req, res) => {
  res.json({
    name: 'Tomato AI Admin Backend',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      documentation: '/',
      health: '/health',
      auth: {
        login: 'POST /api/auth/admin/login',
        changePassword: 'POST /api/auth/admin/change-password'
      },
      admin: {
        profile: 'GET /api/admin/profile',
        users: 'GET /api/admin/users',
        userDetails: 'GET /api/admin/users/:userId',
        userStats: 'GET /api/admin/stats',
        admins: 'GET /api/admin/admins',
        createAdmin: 'POST /api/admin/admins'
      },
      users: {
        withData: 'GET /api/users/with-data'
      },
      system: {
        logs: 'GET /api/system/logs',
        health: 'GET /api/system/health',
        cleanupLogs: 'DELETE /api/system/logs/cleanup'
      },
      config: {
        diseaseRecommendations: 'GET,POST,PUT,DELETE /api/config/disease-recommendations',
        soilRecommendations: 'GET,POST,PUT,DELETE /api/config/soil-recommendations',
        optimalRanges: 'GET,POST,DELETE /api/config/optimal-ranges',
        fusionThresholds: 'GET,PUT /api/config/fusion-thresholds',
        fusionWeights: 'GET,PUT /api/config/fusion-weights',
        soilQualityThresholds: 'GET,POST /api/config/soil-quality-thresholds',
        tomatoThresholds: 'GET,PUT /api/config/tomato-thresholds'
      }
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version
  });
});

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`
    }
  });
});

// ==================== API ROUTES ====================
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/config', configRoutes);

// ==================== 404 HANDLER ====================
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    message: 'The requested endpoint does not exist',
    availableEndpoints: {
      documentation: 'GET /',
      health: 'GET /health',
      auth: '/api/auth/*',
      admin: '/api/admin/*',
      users: '/api/users/*',
      system: '/api/system/*',
      config: '/api/config/*'
    }
  });
});

// ==================== GLOBAL ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Handle specific error types
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ 
      error: 'Request entity too large',
      message: 'The request body exceeds the size limit'
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation Error',
      message: err.message
    });
  }
  
  // Default error response
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`=================================`);
  console.log(`🚀 Tomato AI Admin Backend`);
  console.log(`=================================`);
  console.log(`📡 Server running on:`);
  console.log(`   - Local: http://localhost:${PORT}`);
  console.log(`   - Network: http://${HOST}:${PORT}`);
  console.log(`   - Render: https://admin-backend-zh2f.onrender.com`);
  console.log(`=================================`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 CORS enabled for multiple origins`);
  console.log(`📊 API Routes:`);
  console.log(`   - GET  /            - API Documentation`);
  console.log(`   - GET  /health      - Health Check`);
  console.log(`   - POST /api/auth/admin/login - Admin Login`);
  console.log(`   - GET  /api/admin/stats - System Statistics`);
  console.log(`   - GET  /api/system/logs - System Logs`);
  console.log(`   - *    /api/config/* - Configuration Management`);
  console.log(`=================================`);
});

// ==================== GRACEFUL SHUTDOWN ====================
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Perform cleanup if needed
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Perform cleanup if needed
});

module.exports = app;