/**
 * Players API Routes
 * GET /api/players - List all players with optional filters
 */

import express from 'express';
const router = express.Router();

/**
 * GET /api/players
 * Returns all players, optionally filtered by position and/or club
 * 
 * Query parameters:
 *   - position: Filter by position (Goalkeeper, Defender, Midfielder, Forward)
 *   - club_id: Filter by club UUID
 * 
 * @returns {Array} Array of players with club information
 */
router.get('/', async (req, res, next) => {
  const startTime = Date.now();
  const pool = req.app.locals.pool;
  const { position, club_id } = req.query;

  try {
    let query = `
      SELECT 
        p.player_id,
        p.name,
        p.position,
        p.nationality,
        p.age,
        c.club_id,
        c.name AS club_name,
        c.logo_url AS club_logo
      FROM players p
      INNER JOIN clubs c ON p.club_id = c.club_id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 0;

    if (position) {
      paramCount++;
      query += ` AND p.position = $${paramCount}`;
      queryParams.push(position);
    }

    if (club_id) {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(club_id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid club ID format. Expected UUID.'
        });
      }
      paramCount++;
      query += ` AND c.club_id = $${paramCount}`;
      queryParams.push(club_id);
    }

    query += ` ORDER BY c.name, 
      CASE p.position
        WHEN 'Goalkeeper' THEN 1
        WHEN 'Defender' THEN 2
        WHEN 'Midfielder' THEN 3
        WHEN 'Forward' THEN 4
        ELSE 5
      END,
      p.name`;

    const result = await pool.query(query, queryParams.length > 0 ? queryParams : undefined);
    const duration = Date.now() - startTime;

    if (duration > 200) {
      console.warn(`⚠ Players query took ${duration}ms (target: <200ms)`);
    }

    res.json({
      success: true,
      count: result.rows.length,
      filters: { position: position || null, club_id: club_id || null },
      data: result.rows,
      duration: `${duration}ms`
    });
  } catch (error) {
    next(error);
  }
});

export default router;
