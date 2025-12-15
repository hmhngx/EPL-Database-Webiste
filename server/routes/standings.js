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

  if (!pool) {
    return res.status(503).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  try {
    const query = `
      SELECT 
        team_id,
        team_name,
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

    // Add logo_url for each team (generate if not present in database)
    const standings = result.rows.map(team => ({
      ...team,
      logo_url: team.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(team.team_name)}&background=38003C&color=fff&size=128`
    }));

    res.json({
      success: true,
      count: standings.length,
      data: standings,
      duration: `${duration}ms`
    });
  } catch (error) {
    next(error);
  }
});

export default router;

