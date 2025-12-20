/**
 * Analytics API Routes
 * GET /api/analytics/club/:id - Get club analytics timeseries data
 */

import express from 'express';
const router = express.Router();

/**
 * GET /api/analytics/club/:id
 * Returns timeseries analytics data for a specific club
 * 
 * @param {string} id - Club/Team UUID
 * @returns {Object} Timeseries data with matchweek-by-matchweek performance
 */
router.get('/club/:id', async (req, res, next) => {
  const startTime = Date.now();
  const pool = req.app.locals.pool;

  if (!pool) {
    return res.status(503).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Club ID is required'
    });
  }

  try {
    // Query the club_analytics_timeseries view for the specific team
    // SELECT * ensures all columns including 'result' are fetched
    const query = `
      SELECT * FROM club_analytics_timeseries 
      WHERE team_id = $1 
      ORDER BY matchweek ASC
    `;

    const result = await pool.query(query, [id]);
    const duration = Date.now() - startTime;

    // Log if response time exceeds 200ms
    if (duration > 200) {
      console.warn(`⚠ Analytics query took ${duration}ms (target: <200ms)`);
    }

    // Handle empty results - return empty array with 200 status
    if (!result.rows || result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          timeseries: [],
          totalMatches: 0
        },
        count: 0,
        duration: `${duration}ms`
      });
    }

    // Verify that 'result' column exists in the data
    // If missing, log a warning but continue (frontend will handle gracefully)
    if (result.rows.length > 0 && !result.rows[0].hasOwnProperty('result')) {
      console.warn('⚠ Warning: "result" column not found in club_analytics_timeseries view');
    }

    res.json({
      success: true,
      data: {
        timeseries: result.rows,
        totalMatches: result.rows.length
      },
      count: result.rows.length,
      duration: `${duration}ms`
    });

  } catch (error) {
    console.error('Error fetching club analytics:', error);
    next(error);
  }
});

export default router;

