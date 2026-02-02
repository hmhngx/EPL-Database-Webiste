/**
 * Scout API Routes
 * Career Path Prediction and Player Comparison
 */

import express from 'express';
import {
  generateCareerPrediction,
  comparePlayersForSigning
} from '../services/playerScoutService.js';

const router = express.Router();

/**
 * POST /api/scout/predict/:playerId
 * Generate career path prediction for a player
 * 
 * @param {string} playerId - Player ID (UUID)
 * @returns {Object} Career prediction with analysis and projections
 */
router.post('/predict/:playerId', async (req, res, next) => {
  const startTime = Date.now();
  const pool = req.app.locals.pool;

  if (!pool) {
    return res.status(503).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  const { playerId } = req.params;

  try {
    const prediction = await generateCareerPrediction(pool, playerId);
    
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: prediction,
      duration: `${duration}ms`
    });
  } catch (error) {
    console.error('Error generating career prediction:', error);
    next(error);
  }
});

/**
 * POST /api/scout/compare
 * Compare two players for long-term signing decision
 * 
 * Request body:
 * {
 *   "playerId1": "uuid",
 *   "playerId2": "uuid",
 *   "clubContext": "optional context string"
 * }
 * 
 * @returns {Object} Comparison analysis with recommendation
 */
router.post('/compare', async (req, res, next) => {
  const startTime = Date.now();
  const pool = req.app.locals.pool;

  if (!pool) {
    return res.status(503).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  const { playerId1, playerId2, clubContext } = req.body;

  // Validate inputs
  if (!playerId1 || !playerId2) {
    return res.status(400).json({
      success: false,
      error: 'Both playerId1 and playerId2 are required'
    });
  }

  if (playerId1 === playerId2) {
    return res.status(400).json({
      success: false,
      error: 'Cannot compare a player to themselves'
    });
  }

  try {
    const comparison = await comparePlayersForSigning(
      pool,
      playerId1,
      playerId2,
      clubContext || ''
    );
    
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: comparison,
      duration: `${duration}ms`
    });
  } catch (error) {
    console.error('Error comparing players:', error);
    next(error);
  }
});

export default router;
