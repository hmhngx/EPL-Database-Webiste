/**
 * Clubs API Routes
 * GET /api/clubs - List all clubs
 * GET /api/clubs/:id - Get club details with stadium
 * GET /api/clubs/:id/squad - Get players for a club
 */

import express from 'express';
const router = express.Router();

/**
 * GET /api/clubs
 * Returns all clubs with basic information
 * 
 * @returns {Array} Array of clubs
 */
router.get('/', async (req, res, next) => {
  const startTime = Date.now();
  const pool = req.app.locals.pool;

  try {
    const query = `
      SELECT 
        c.club_id,
        c.name,
        c.founded,
        c.logo_url,
        s.name AS stadium_name,
        s.city AS stadium_city,
        s.capacity AS stadium_capacity
      FROM clubs c
      INNER JOIN stadiums s ON c.stadium_id = s.stadium_id
      ORDER BY c.name
    `;

    const result = await pool.query(query);
    const duration = Date.now() - startTime;

    if (duration > 200) {
      console.warn(`⚠ Clubs list query took ${duration}ms (target: <200ms)`);
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

/**
 * GET /api/clubs/:id
 * Returns detailed information about a specific club including stadium
 * 
 * @param {string} id - Club UUID
 * @returns {Object} Club details with stadium information
 */
router.get('/:id', async (req, res, next) => {
  const startTime = Date.now();
  const pool = req.app.locals.pool;
  const { id } = req.params;

  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid club ID format. Expected UUID.'
      });
    }

    const query = `
      SELECT 
        c.club_id,
        c.name,
        c.founded,
        c.logo_url,
        s.stadium_id,
        s.name AS stadium_name,
        s.city AS stadium_city,
        s.capacity AS stadium_capacity,
        (
          SELECT COUNT(*) 
          FROM players p 
          WHERE p.club_id = c.club_id
        ) AS player_count,
        (
          SELECT COUNT(*) 
          FROM matches m 
          WHERE m.home_club_id = c.club_id OR m.away_club_id = c.club_id
        ) AS match_count
      FROM clubs c
      INNER JOIN stadiums s ON c.stadium_id = s.stadium_id
      WHERE c.club_id = $1
    `;

    const result = await pool.query(query, [id]);
    const duration = Date.now() - startTime;

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Club not found'
      });
    }

    if (duration > 200) {
      console.warn(`⚠ Club details query took ${duration}ms (target: <200ms)`);
    }

    res.json({
      success: true,
      data: result.rows[0],
      duration: `${duration}ms`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/clubs/:id/squad
 * Returns all players for a specific club
 * 
 * @param {string} id - Club UUID
 * @returns {Array} Array of players for the club
 */
router.get('/:id/squad', async (req, res, next) => {
  const startTime = Date.now();
  const pool = req.app.locals.pool;
  const { id } = req.params;

  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid club ID format. Expected UUID.'
      });
    }

    // First verify club exists
    const clubCheck = await pool.query(
      'SELECT name FROM clubs WHERE club_id = $1',
      [id]
    );

    if (clubCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Club not found'
      });
    }

    const query = `
      SELECT 
        p.player_id,
        p.name,
        p.position,
        p.nationality,
        p.age
      FROM players p
      WHERE p.club_id = $1
      ORDER BY 
        CASE p.position
          WHEN 'Goalkeeper' THEN 1
          WHEN 'Defender' THEN 2
          WHEN 'Midfielder' THEN 3
          WHEN 'Forward' THEN 4
          ELSE 5
        END,
        p.name
    `;

    const result = await pool.query(query, [id]);
    const duration = Date.now() - startTime;

    if (duration > 200) {
      console.warn(`⚠ Squad query took ${duration}ms (target: <200ms)`);
    }

    res.json({
      success: true,
      club: clubCheck.rows[0].name,
      count: result.rows.length,
      data: result.rows,
      duration: `${duration}ms`
    });
  } catch (error) {
    next(error);
  }
});

export default router;

