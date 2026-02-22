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

  if (!pool) {
    return res.status(503).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  const { position, club_id } = req.query;

  try {
    let query = `
      SELECT 
        p.id,
        p.player_name,
        p.position,
        p.nationality,
        p.age,
        p.jersey_number,
        p.goals,
        p.assists,
        p.xg,
        p.xag,
        p.progressive_passes,
        p.appearances,
        p.minutes_played,
        p.yellow_cards,
        p.red_cards,
        p.sofascore_rating,
        p.market_value,
        t.team_id,
        t.team_name,
        t.logo_url,
        CASE 
          WHEN t.captain_id IS NOT NULL AND t.captain_id = p.id THEN true
          ELSE false 
        END AS is_captain
      FROM players p
      INNER JOIN team t ON p.team_id = t.team_id
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
      query += ` AND t.team_id = $${paramCount}`;
      queryParams.push(club_id);
    }

    query += ` ORDER BY t.team_name, 
      CASE p.position
        WHEN 'Goalkeeper' THEN 1
        WHEN 'Defender' THEN 2
        WHEN 'Midfielder' THEN 3
        WHEN 'Forward' THEN 4
        ELSE 5
      END,
        p.player_name`;

    let result;
    try {
      result = await pool.query(query, queryParams.length > 0 ? queryParams : undefined);
    } catch (queryError) {
      // If the query fails due to missing captain_id column, try a simpler query
      if (queryError.message && queryError.message.includes('captain_id')) {
        console.warn('⚠ captain_id column not found, using fallback query');
        // Reset query params for fallback
        const fallbackParams = [];
        let fallbackParamCount = 0;
        
        query = `
          SELECT 
            p.id,
            p.player_name,
            p.position,
            p.nationality,
            p.age,
            p.jersey_number,
            p.goals,
            p.assists,
            p.xg,
            p.xag,
            p.progressive_passes,
            p.appearances,
            p.minutes_played,
            p.yellow_cards,
            p.red_cards,
            p.sofascore_rating,
            p.market_value,
            t.team_id,
            t.team_name,
            t.logo_url,
            false AS is_captain
          FROM players p
          INNER JOIN team t ON p.team_id = t.team_id
          WHERE 1=1
        `;
        
        if (position) {
          fallbackParamCount++;
          query += ` AND p.position = $${fallbackParamCount}`;
          fallbackParams.push(position);
        }
        
        if (club_id) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(club_id)) {
            fallbackParamCount++;
            query += ` AND t.team_id = $${fallbackParamCount}`;
            fallbackParams.push(club_id);
          }
        }
        
        query += ` ORDER BY t.team_name, 
          CASE p.position
            WHEN 'Goalkeeper' THEN 1
            WHEN 'Defender' THEN 2
            WHEN 'Midfielder' THEN 3
            WHEN 'Forward' THEN 4
            ELSE 5
          END,
            p.player_name`;
        
        result = await pool.query(query, fallbackParams.length > 0 ? fallbackParams : undefined);
      } else {
        throw queryError;
      }
    }

    const duration = Date.now() - startTime;

    if (duration > 200) {
      console.warn(`⚠ Players query took ${duration}ms (target: <200ms)`);
    }

    // Use logo_url from database if available, otherwise fallback to ui-avatars
    // Ensure is_captain is boolean
    const players = result.rows.map(player => ({
      ...player,
      team_logo: player.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.team_name)}&background=38003C&color=fff&size=128`,
      is_captain: player.is_captain === true || player.is_captain === 'true' || player.is_captain === 1
    }));

    res.json({
      success: true,
      count: players.length,
      filters: { position: position || null, team_id: club_id || null },
      data: players,
      duration: `${duration}ms`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/players/top
 * Returns top 10 players for a given category
 * 
 * Query parameters:
 *   - category: The stat category (goals, assists, xg, sofascore_rating, progressive_passes)
 * 
 * @returns {Array} Array of top 10 players with team information
 */
router.get('/top', async (req, res) => {
  const startTime = Date.now();
  const pool = req.app.locals.pool;

  if (!pool) {
    return res.status(503).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  const { category } = req.query;

  // Valid categories mapping
  const validCategories = {
    'goals': 'goals',
    'assists': 'assists',
    'xg': 'xg',
    'sofascore_rating': 'sofascore_rating',
    'progressive_passes': 'progressive_passes',
    'appearances': 'appearances'
  };

  if (!category || !validCategories[category]) {
    console.error('Invalid category received:', category);
    console.error('Valid categories:', Object.keys(validCategories));
    return res.status(400).json({
      success: false,
      error: 'Invalid or missing category. Valid categories: goals, assists, xg, sofascore_rating, progressive_passes, appearances',
      received: category || 'undefined',
      validKeys: Object.keys(validCategories)
    });
  }

  const columnName = validCategories[category];

  try {
    // Use parameterized query with column name validation
    // Since column names can't be parameterized, we validate against whitelist
    const query = `
      SELECT 
        p.id,
        p.player_name,
        p.${columnName} as stat_value,
        t.team_id,
        t.team_name,
        t.logo_url
      FROM players p
      INNER JOIN team t ON p.team_id = t.team_id
      WHERE p.${columnName} IS NOT NULL
      ORDER BY p.${columnName} DESC
      LIMIT 10
    `;

    const result = await pool.query(query);

    const duration = Date.now() - startTime;

    if (duration > 200) {
      console.warn(`⚠ Top players query took ${duration}ms (target: <200ms)`);
    }

    // Format response with team logo fallback
    const players = result.rows.map((player, index) => ({
      ...player,
      rank: index + 1,
      team_logo: player.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.team_name)}&background=38003C&color=fff&size=128`
    }));

    res.json({
      success: true,
      category,
      count: players.length,
      data: players,
      duration: `${duration}ms`
    });
  } catch (error) {
    console.error(`Error fetching top players for category ${category}:`, error);
    // Return a more detailed error response
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch top players',
      details: error.message,
      category
    });
  }
});

/**
 * GET /api/players/:id
 * Returns a single player by ID with performance stats and team information
 * 
 * @param {string} id - Player ID (UUID or numeric ID)
 * @returns {Object} Player object with performance stats and team information
 */
router.get('/:id', async (req, res, next) => {
  const startTime = Date.now();
  const pool = req.app.locals.pool;

  if (!pool) {
    return res.status(503).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  const { id } = req.params;

  // Accept both UUID and numeric IDs
  // PostgreSQL will handle type conversion automatically based on the column type
  try {
    const query = `
      SELECT 
        p.id,
        p.player_name,
        p.position,
        p.nationality,
        p.age,
        p.jersey_number,
        p.height,
        p.weight,
        p.goals,
        p.assists,
        p.xg,
        p.xag,
        p.progressive_passes,
        p.appearances,
        p.minutes_played,
        p.yellow_cards,
        p.red_cards,
        p.sofascore_rating,
        t.team_name,
        t.logo_url
      FROM players p
      INNER JOIN team t ON p.team_id = t.team_id
      WHERE p.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Player not found'
      });
    }

    const duration = Date.now() - startTime;

    if (duration > 200) {
      console.warn(`⚠ Player query took ${duration}ms (target: <200ms)`);
    }

    const player = result.rows[0];

    res.json({
      success: true,
      data: {
        ...player,
        team_logo: player.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.team_name)}&background=38003C&color=fff&size=128`
      },
      duration: `${duration}ms`
    });
  } catch (error) {
    next(error);
  }
});

export default router;
