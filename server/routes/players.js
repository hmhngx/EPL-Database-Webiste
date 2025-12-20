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

export default router;
