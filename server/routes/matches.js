/**
 * Matches API Routes
 * GET /api/matches - Get all matches (supports ?gameweek query param)
 */

import express from 'express';
const router = express.Router();

/**
 * GET /api/matches
 * Returns all matches, optionally filtered by gameweek
 * 
 * Query parameters:
 *   - gameweek: Filter matches by gameweek (1-38)
 * 
 * @returns {Array} Array of matches with club names
 */
router.get('/', async (req, res, next) => {
  const startTime = Date.now();
  const pool = req.app.locals.pool;
  const { gameweek } = req.query;

  try {
    let query = `
      SELECT 
        m.match_id,
        m.date,
        m.home_goals,
        m.away_goals,
        m.attendance,
        m.referee,
        h.club_id AS home_club_id,
        h.name AS home_club,
        a.club_id AS away_club_id,
        a.name AS away_club
      FROM matches m
      INNER JOIN clubs h ON m.home_club_id = h.club_id
      INNER JOIN clubs a ON m.away_club_id = a.club_id
    `;

    const queryParams = [];

    // Filter by gameweek if provided
    if (gameweek) {
      const gameweekNum = parseInt(gameweek, 10);
      if (isNaN(gameweekNum) || gameweekNum < 1 || gameweekNum > 38) {
        return res.status(400).json({
          success: false,
          error: 'Invalid gameweek. Must be a number between 1 and 38.'
        });
      }

      // Calculate gameweek using window function
      // Each gameweek typically has 10 matches (5 fixtures per round)
      // We'll assign gameweek numbers based on chronological order
      query = `
        WITH match_gameweeks AS (
          SELECT 
            m.match_id,
            ROW_NUMBER() OVER (ORDER BY DATE(m.date), m.match_id) - 1 AS match_index,
            FLOOR((ROW_NUMBER() OVER (ORDER BY DATE(m.date), m.match_id) - 1) / 10.0) + 1 AS gameweek_num
          FROM matches m
        )
        SELECT 
          m.match_id,
          m.date,
          m.home_goals,
          m.away_goals,
          m.attendance,
          m.referee,
          h.club_id AS home_club_id,
          h.name AS home_club,
          a.club_id AS away_club_id,
          a.name AS away_club
        FROM matches m
        INNER JOIN clubs h ON m.home_club_id = h.club_id
        INNER JOIN clubs a ON m.away_club_id = a.club_id
        INNER JOIN match_gameweeks mg ON m.match_id = mg.match_id
        WHERE mg.gameweek_num = $1
      `;
      queryParams.push(gameweekNum);
    }

    if (!gameweek) {
      query += ` ORDER BY m.date DESC`;
    } else {
      query += ` ORDER BY m.date ASC`;
    }

    const result = await pool.query(query, queryParams.length > 0 ? queryParams : undefined);
    const duration = Date.now() - startTime;

    if (duration > 200) {
      console.warn(`⚠ Matches query took ${duration}ms (target: <200ms)`);
    }

    res.json({
      success: true,
      count: result.rows.length,
      gameweek: gameweek || null,
      data: result.rows,
      duration: `${duration}ms`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/matches/:id
 * Returns details for a specific match
 * 
 * @param {string} id - Match UUID
 * @returns {Object} Match details
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
        error: 'Invalid match ID format. Expected UUID.'
      });
    }

    const query = `
      SELECT 
        m.match_id,
        m.date,
        m.home_goals,
        m.away_goals,
        m.attendance,
        m.referee,
        h.club_id AS home_club_id,
        h.name AS home_club,
        h.logo_url AS home_logo,
        a.club_id AS away_club_id,
        a.name AS away_club,
        a.logo_url AS away_logo,
        s.name AS stadium_name,
        s.city AS stadium_city
      FROM matches m
      INNER JOIN clubs h ON m.home_club_id = h.club_id
      INNER JOIN clubs a ON m.away_club_id = a.club_id
      INNER JOIN stadiums s ON h.stadium_id = s.stadium_id
      WHERE m.match_id = $1
    `;

    const result = await pool.query(query, [id]);
    const duration = Date.now() - startTime;

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }

    if (duration > 200) {
      console.warn(`⚠ Match details query took ${duration}ms (target: <200ms)`);
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

export default router;

