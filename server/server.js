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
import standingsRouter from './routes/standings.js';
import clubsRouter from './routes/clubs.js';
import matchesRouter from './routes/matches.js';
import playersRouter from './routes/players.js';
import analyticsRouter from './routes/analytics.js';
import searchRouter from './routes/search.js';
import aiRouter from './routes/ai.js';
import scoutRouter from './routes/scout.js';

// Load environment variables from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

// Check if .env file exists before loading
import { existsSync } from 'fs';
if (!existsSync(envPath)) {
  console.error('='.repeat(60));
  console.error('✗ ERROR: .env file not found!');
  console.error('='.repeat(60));
  console.error(`Expected location: ${envPath}`);
  console.error('');
  console.error('Quick fix:');
  console.error('  1. Run: powershell -ExecutionPolicy Bypass -File create-env.ps1');
  console.error('  2. Or manually: Copy-Item server\\env.example .env');
  console.error('  3. Edit .env and add your Supabase connection string');
  console.error('');
  console.error('Example .env content:');
  console.error('  SUPABASE_CONNECTION_STRING=postgresql://postgres:password@db.project.supabase.co:5432/postgres');
  console.error('  PORT=5000');
  console.error('  NODE_ENV=development');
  console.error('='.repeat(60));
  process.exit(1);
}

dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// Database Connection Pool
// ============================================
// Validate connection string before creating pool
const connectionString = process.env.SUPABASE_CONNECTION_STRING;

if (!connectionString || connectionString.trim() === '' || connectionString.includes('[YOUR-')) {
  console.error('='.repeat(60));
  console.error('✗ ERROR: SUPABASE_CONNECTION_STRING is not set or contains placeholder!');
  console.error('='.repeat(60));
  console.error('Current value:', connectionString ? `"${connectionString.substring(0, 50)}..."` : '(empty or undefined)');
  console.error('');
  console.error('Please edit .env file and set a valid connection string:');
  console.error('');
  console.error('For Direct Connection (port 5432):');
  console.error('  SUPABASE_CONNECTION_STRING=postgresql://postgres:password@db.project.supabase.co:5432/postgres');
  console.error('');
  console.error('For Connection Pooling (port 6543):');
  console.error('  SUPABASE_CONNECTION_STRING=postgresql://postgres.projectref:password@aws-0-region.pooler.supabase.com:6543/postgres');
  console.error('');
  console.error('⚠ IMPORTANT: Remove brackets [] around password if present!');
  console.error('');
  console.error('Get your connection string from:');
  console.error('  Supabase Dashboard → Settings → Database → Connection string');
  console.error('');
  console.error('Note: If your password contains special characters, URL-encode them:');
  console.error('  @ → %40, # → %23, $ → %24, etc.');
  console.error('='.repeat(60));
  process.exit(1);
}

let pool;
try {
  // Clean connection string - remove any brackets around password
  let cleanConnectionString = connectionString;
  // Remove brackets if they exist around the password
  cleanConnectionString = cleanConnectionString.replace(/\[([^\]]+)\]/g, '$1');
  
  // Supabase requires SSL for all connections (both direct and pooler)
  const isSupabase = cleanConnectionString.includes('supabase.co') || cleanConnectionString.includes('pooler.supabase.com');
  
  pool = new Pool({
    connectionString: cleanConnectionString,
    ssl: isSupabase || process.env.NODE_ENV === 'production' 
      ? { 
          rejectUnauthorized: false,
          keepAlive: true // Keep connections alive to prevent timeouts
        } 
      : false,
    max: 10, // Maximum number of clients in the pool (reduced for stability)
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Fail fast if no connection (2 seconds)
  });
  
  if (isSupabase) {
    console.log('✓ Using Supabase connection (SSL enabled)');
  }
} catch (error) {
  console.error('='.repeat(60));
  console.error('✗ ERROR: Failed to create database connection pool');
  console.error('='.repeat(60));
  console.error('Error:', error.message);
  console.error('Please check your SUPABASE_CONNECTION_STRING in .env file.');
  console.error('');
  console.error('Common issues:');
  console.error('  - Remove brackets [] around password');
  console.error('  - Ensure password is URL-encoded if it has special characters');
  console.error('  - Check that connection string format is correct');
  console.error('='.repeat(60));
  process.exit(1);
}

// Test database connection immediately (non-blocking)
// This will log errors but allow server to start
(async () => {
  try {
    console.log('Testing database connection...');
    const testResult = await pool.query('SELECT NOW()');
    console.log('✓ Database connection successful');
    console.log(`  Server time: ${testResult.rows[0].now}`);
  } catch (error) {
    console.error('='.repeat(60));
    console.error('✗ WARNING: Failed to connect to database');
    console.error('='.repeat(60));
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.message.includes('password') || error.message.includes('authentication')) {
      console.error('');
      console.error('Authentication error detected. Common causes:');
      console.error('  - Incorrect database password');
      console.error('  - Special characters in password need URL encoding');
      console.error('  - Password contains: @, #, $, %, &, etc.');
    }
    if (error.message.includes('SSL') || error.code === '23505') {
      console.error('');
      console.error('SSL error detected. Supabase requires SSL connections.');
    }
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Verify your SUPABASE_CONNECTION_STRING is correct');
    console.error('2. Check that your IP is allowed in Supabase firewall');
    console.error('3. Ensure your database password is URL-encoded if it has special chars');
    console.error('4. Make sure SSL is enabled (required for Supabase)');
    console.error('5. Test connection string format: postgresql://user:pass@host:port/db');
    console.error('='.repeat(60));
    console.error('Server will start but API endpoints will return 503 errors.');
    console.error('Fix the connection string and restart the server.');
    console.error('='.repeat(60));
  }
})();

// Handle pool errors with better logging
pool.on('error', (err) => {
  console.error('✗ Database pool error:', err.message);
  if (err.code) {
    console.error('  Error code:', err.code);
  }
  // Don't exit on pool errors - they might be recoverable
  // The pool will attempt to reconnect automatically
});

// Monitor pool connections (helpful for debugging in development)
if (process.env.NODE_ENV === 'development') {
  pool.on('connect', (client) => {
    // Client connected to pool
  });

  pool.on('remove', (client) => {
    // Client removed from pool
  });
}

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

// Database connection check middleware
app.use((req, res, next) => {
  if (!pool || !app.locals.pool) {
    return res.status(503).json({
      success: false,
      error: 'Database connection not available. Please check server configuration and logs.',
      hint: 'Check the server console for connection errors. Verify SUPABASE_CONNECTION_STRING in .env file.'
    });
  }
  next();
});

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
  if (!pool) {
    return res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: 'Database pool not initialized',
      hint: 'Check server logs for connection errors'
    });
  }

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
      error: error.message,
      code: error.code,
      hint: 'Check SUPABASE_CONNECTION_STRING in .env file'
    });
  }
});

// ============================================
// API Routes
// ============================================
// Use route files for better organization
app.use('/api/standings', standingsRouter);
app.use('/api/clubs', clubsRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/players', playersRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/search', searchRouter);
app.use('/api/ai', aiRouter);
app.use('/api/scout', scoutRouter);

// ============================================
// Error Handling Middleware
// ============================================
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('Error:', err);
  
  // Handle database connection errors specifically
  if (err.message && err.message.includes('searchParams')) {
    return res.status(503).json({
      success: false,
      error: 'Database connection configuration error. Please check your SUPABASE_CONNECTION_STRING in .env file.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  
  // Handle PostgreSQL errors
  if (err.code && err.code.startsWith('2')) {
    return res.status(400).json({
      success: false,
      error: 'Database query error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  
  // Handle connection errors
  if (err.code && err.code.startsWith('5')) {
    return res.status(503).json({
      success: false,
      error: 'Database connection error. Please check your connection settings.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
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

