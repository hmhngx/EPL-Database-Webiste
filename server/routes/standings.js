/**
 * Standings API Routes
 * GET /api/standings - Get league standings
 */

import express from 'express';
const router = express.Router();

/**
 * GET /api/standings
 * Returns the current league standings from the league_standings view
 * 
 * @returns {Array} Array of club standings with mp, w, d, l, gf, ga, gd, pts
 */
router.get('/', async (req, res, next) => {
  const startTime = Date.now();
  const pool = req.app.locals.pool;

  try {
    const query = `
      SELECT 
        club_id,
        club,
        mp,
        w,
        d,
        l,
        gf,
        ga,
        gd,
        pts
      FROM league_standings
      ORDER BY pts DESC, gd DESC
    `;

    const result = await pool.query(query);
    const duration = Date.now() - startTime;

    // Log if response time exceeds 200ms
    if (duration > 200) {
      console.warn(`⚠ Standings query took ${duration}ms (target: <200ms)`);
    }

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
      duration: `${duration}ms`
    });
  } catch (error) {
    next(error);
  }
});

export default router;

