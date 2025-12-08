/**
 * Express Server for Premier League Analytics App
 * Connects to PostgreSQL (Supabase) database
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import standingsRoutes from './routes/standings.js';
import clubsRoutes from './routes/clubs.js';
import matchesRoutes from './routes/matches.js';
import playersRoutes from './routes/players.js';

// Load environment variables from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// Database Connection Pool
// ============================================
const pool = new Pool({
  connectionString: process.env.SUPABASE_CONNECTION_STRING,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Test database connection
pool.on('connect', () => {
  console.log('✓ Database connection pool established');
});

pool.on('error', (err) => {
  console.error('✗ Unexpected error on idle client', err);
  process.exit(-1);
});

// Make pool available to routes
app.locals.pool = pool;

// ============================================
// Middleware
// ============================================

// CORS middleware - allow requests from frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Vite default port
  credentials: true
}));

// JSON parsing middleware
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// ============================================
// Health Check Route
// ============================================
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: result.rows[0].now,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

// ============================================
// API Routes
// ============================================
app.use('/api/standings', standingsRoutes);
app.use('/api/clubs', clubsRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/players', playersRoutes);

// ============================================
// Error Handling Middleware
// ============================================
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
// eslint-disable-next-line no-unused-vars
app.use((req, res, _next) => {
  res.status(404).json({ error: 'Route not found' });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`Premier League Analytics API Server`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

export default app;

