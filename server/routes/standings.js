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
        ls.team_id,
        ls.team_name,
        ls.mp,
        ls.w,
        ls.d,
        ls.l,
        ls.gf,
        ls.ga,
        ls.gd,
        ls.pts,
        COALESCE(SUM(pa.adjustment), 0) AS total_adjustment,
        (ls.pts + COALESCE(SUM(pa.adjustment), 0)) AS adjusted_pts,
        t.logo_url
      FROM league_standings ls
      LEFT JOIN team t ON ls.team_id = t.team_id
      LEFT JOIN point_adjustments pa ON ls.team_id = pa.team_id
      GROUP BY ls.team_id, ls.team_name, ls.mp, ls.w, ls.d, ls.l, ls.gf, ls.ga, ls.gd, ls.pts, t.logo_url
      ORDER BY adjusted_pts DESC, ls.gd DESC
    `;

    const result = await pool.query(query);
    const duration = Date.now() - startTime;

    // Log if response time exceeds 200ms
    if (duration > 200) {
      console.warn(`⚠ Standings query took ${duration}ms (target: <200ms)`);
    }

    // Use logo_url from database if available, otherwise fallback to ui-avatars
    // Use adjusted_pts as the final points value
    const standings = result.rows.map(team => ({
      ...team,
      pts: team.adjusted_pts, // Use adjusted points as the final points value
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

