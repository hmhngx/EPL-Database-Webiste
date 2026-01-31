/**
 * Search API Routes
 * GET /api/search?q=... - Search for players and teams
 */

import express from 'express';
const router = express.Router();

/**
 * GET /api/search
 * Searches for players and teams matching the query string
 * 
 * Query parameters:
 *   - q: Search query string (required)
 *   - limit: Maximum number of results per category (default: 10)
 * 
 * @returns {Object} Categorized results: { players: [...], teams: [...] }
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

  const { q, limit = 10 } = req.query;

  // Validate query parameter
  if (!q || q.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Query parameter "q" is required'
    });
  }

  const searchTerm = `%${q.trim()}%`;
  const resultLimit = Math.min(parseInt(limit, 10) || 10, 50); // Cap at 50 results

  try {
    // Search players with team information
    const playersQuery = `
      SELECT 
        p.id,
        p.player_name,
        p.position,
        p.team_id,
        t.team_name,
        t.logo_url AS team_logo_url
      FROM players p
      INNER JOIN team t ON p.team_id = t.team_id
      WHERE p.player_name ILIKE $1
      ORDER BY 
        CASE 
          WHEN p.player_name ILIKE $2 THEN 1
          WHEN p.player_name ILIKE $3 THEN 2
          ELSE 3
        END,
        p.player_name
      LIMIT $4
    `;

    // Search teams
    const teamsQuery = `
      SELECT 
        t.team_id,
        t.team_name,
        t.logo_url
      FROM team t
      WHERE t.team_name ILIKE $1
      ORDER BY 
        CASE 
          WHEN t.team_name ILIKE $2 THEN 1
          WHEN t.team_name ILIKE $3 THEN 2
          ELSE 3
        END,
        t.team_name
      LIMIT $4
    `;

    // Execute both queries in parallel
    const [playersResult, teamsResult] = await Promise.all([
      pool.query(playersQuery, [
        searchTerm,
        `${q.trim()}%`, // Starts with query (highest priority)
        `%${q.trim()}%`, // Contains query (lower priority)
        resultLimit
      ]),
      pool.query(teamsQuery, [
        searchTerm,
        `${q.trim()}%`, // Starts with query (highest priority)
        `%${q.trim()}%`, // Contains query (lower priority)
        resultLimit
      ])
    ]);

    // Format players results with team logo fallback
    const players = playersResult.rows.map(player => ({
      id: player.id,
      name: player.player_name,
      position: player.position,
      team_id: player.team_id,
      team_name: player.team_name,
      logo_url: player.team_logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.team_name)}&background=38003C&color=fff&size=128`,
      type: 'player'
    }));

    // Format teams results with logo fallback
    const teams = teamsResult.rows.map(team => ({
      id: team.team_id,
      name: team.team_name,
      logo_url: team.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(team.team_name)}&background=38003C&color=fff&size=128`,
      type: 'team'
    }));

    const duration = Date.now() - startTime;

    if (duration > 200) {
      console.warn(`⚠ Search query took ${duration}ms (target: <200ms)`);
    }

    res.json({
      success: true,
      data: {
        players,
        teams
      },
      query: q.trim(),
      duration: `${duration}ms`
    });
  } catch (error) {
    next(error);
  }
});

export default router;

