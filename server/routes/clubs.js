/**
 * Clubs API Routes
 * GET /api/clubs - List all clubs
 * GET /api/clubs/:id - Get club details with stadium
 * GET /api/clubs/:id/squad - Get players for a club
 * GET /api/clubs/:id/stats - Get club statistics with streaks/form (optimized)
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

  if (!pool) {
    return res.status(503).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  try {
    const query = `
      SELECT 
        t.team_id,
        t.team_name,
        t.founded_year,
        s.id AS stadium_id,
        s.stadium_name,
        s.capacity AS stadium_capacity
      FROM team t
      INNER JOIN stadiums s ON t.stadium_id = s.id
      ORDER BY t.team_name
    `;

    const result = await pool.query(query);
    const duration = Date.now() - startTime;

    if (duration > 200) {
      console.warn(`⚠ Clubs list query took ${duration}ms (target: <200ms)`);
    }

    // Generate logo_url for each team
    const teams = result.rows.map(team => ({
      ...team,
      logo_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(team.team_name)}&background=38003C&color=fff&size=128`
    }));

    res.json({
      success: true,
      count: teams.length,
      data: teams,
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

  if (!pool) {
    return res.status(503).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  const { id } = req.params;

  try {
    // Accept both integer and UUID formats - let PostgreSQL handle type conversion
    // Try to get manager info, but don't fail if managing/managers tables don't exist
    let query = `
      SELECT 
        t.team_id,
        t.team_name,
        t.founded_year,
        s.id AS stadium_id,
        s.stadium_name,
        s.capacity AS stadium_capacity,
        cap.player_name AS captain_name,
        (
          SELECT COUNT(*) 
          FROM players p 
          WHERE p.team_id = t.team_id
        ) AS player_count,
        (
          SELECT COUNT(*) 
          FROM matches m 
          WHERE m.home_team_id = t.team_id OR m.away_team_id = t.team_id
        ) AS match_count
      FROM team t
      INNER JOIN stadiums s ON t.stadium_id = s.id
      LEFT JOIN players cap ON t.captain_id = cap.id
      WHERE t.team_id = $1
    `;

    // Try to add manager info if tables exist
    try {
      const managerQuery = `
        SELECT DISTINCT ON (t.team_id)
          t.team_id,
          t.team_name,
          t.founded_year,
          s.id AS stadium_id,
          s.stadium_name,
          s.capacity AS stadium_capacity,
          cap.player_name AS captain_name,
          mgr.manager_name AS manager_name,
          (
            SELECT COUNT(*) 
            FROM players p 
            WHERE p.team_id = t.team_id
          ) AS player_count,
          (
            SELECT COUNT(*) 
            FROM matches m 
            WHERE m.home_team_id = t.team_id OR m.away_team_id = t.team_id
          ) AS match_count
        FROM team t
        INNER JOIN stadiums s ON t.stadium_id = s.id
        LEFT JOIN players cap ON t.captain_id = cap.id
        LEFT JOIN managing mg ON mg.team_id = t.team_id
        LEFT JOIN managers mgr ON mg.manager_id = mgr.id
        WHERE t.team_id = $1
        ORDER BY t.team_id, mg.season_start DESC NULLS LAST
      `;
      // Test if managing table exists by checking information_schema
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'managing'
        )
      `);
      if (tableCheck.rows[0].exists) {
        query = managerQuery;
        console.log('✅ Using manager query with manager_name');
      } else {
        console.log('⚠ Managing table does not exist, using base query');
      }
    } catch (err) {
      // If check fails, try the manager query anyway (LEFT JOINs won't fail)
      console.log('⚠ Manager tables check failed, trying manager query anyway:', err.message);
      try {
        const managerQuery = `
          SELECT DISTINCT ON (t.team_id)
            t.team_id,
            t.team_name,
            t.founded_year,
            s.id AS stadium_id,
            s.stadium_name,
            s.capacity AS stadium_capacity,
            cap.player_name AS captain_name,
            mgr.manager_name AS manager_name,
            (
              SELECT COUNT(*) 
              FROM players p 
              WHERE p.team_id = t.team_id
            ) AS player_count,
            (
              SELECT COUNT(*) 
              FROM matches m 
              WHERE m.home_team_id = t.team_id OR m.away_team_id = t.team_id
            ) AS match_count
          FROM team t
          INNER JOIN stadiums s ON t.stadium_id = s.id
          LEFT JOIN players cap ON t.captain_id = cap.id
          LEFT JOIN managing mg ON mg.team_id = t.team_id
          LEFT JOIN managers mgr ON mg.manager_id = mgr.id
          WHERE t.team_id = $1
          ORDER BY t.team_id, mg.season_start DESC NULLS LAST
        `;
        query = managerQuery;
        console.log('✅ Using manager query as fallback');
      } catch (fallbackErr) {
        console.log('⚠ Manager query failed, using base query:', fallbackErr.message);
      }
    }

    const result = await pool.query(query, [id]);
    const duration = Date.now() - startTime;

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    if (duration > 200) {
      console.warn(`⚠ Team details query took ${duration}ms (target: <200ms)`);
    }

    // Generate logo_url for the team
    const team = result.rows[0];
    const teamData = {
      ...team,
      logo_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(team.team_name)}&background=38003C&color=fff&size=128`
    };

    // Debug: Log manager_name if present
    if (teamData.manager_name) {
      console.log(`✅ Manager found for ${teamData.team_name}: ${teamData.manager_name}`);
    } else {
      console.log(`⚠ No manager found for ${teamData.team_name} (manager_name: ${teamData.manager_name})`);
    }

    res.json({
      success: true,
      data: teamData,
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

  if (!pool) {
    return res.status(503).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  const { id } = req.params;

  try {
    // Accept both integer and UUID formats - let PostgreSQL handle type conversion
    // First verify team exists
    const teamCheck = await pool.query(
      'SELECT team_name FROM team WHERE team_id = $1',
      [id]
    );

    if (teamCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    let query = `
      SELECT 
        p.id,
        p.player_name,
        p.position,
        p.nationality,
        p.age,
        p.jersey_number,
        CASE 
          WHEN t.captain_id IS NOT NULL AND t.captain_id = p.id THEN true
          ELSE false 
        END AS is_captain
      FROM players p
      INNER JOIN team t ON p.team_id = t.team_id
      WHERE p.team_id = $1
      ORDER BY 
        CASE p.position
          WHEN 'Goalkeeper' THEN 1
          WHEN 'Defender' THEN 2
          WHEN 'Midfielder' THEN 3
          WHEN 'Forward' THEN 4
          ELSE 5
        END,
        p.player_name
    `;

    let result;
    try {
      result = await pool.query(query, [id]);
    } catch (queryError) {
      // If the query fails due to missing captain_id column, try a simpler query
      if (queryError.message && queryError.message.includes('captain_id')) {
        console.warn('⚠ captain_id column not found, using fallback query');
        query = `
          SELECT 
            p.id,
            p.player_name,
            p.position,
            p.nationality,
            p.age,
            p.jersey_number,
            false AS is_captain
          FROM players p
          WHERE p.team_id = $1
          ORDER BY 
            CASE p.position
              WHEN 'Goalkeeper' THEN 1
              WHEN 'Defender' THEN 2
              WHEN 'Midfielder' THEN 3
              WHEN 'Forward' THEN 4
              ELSE 5
            END,
            p.player_name
        `;
        result = await pool.query(query, [id]);
      } else {
        throw queryError;
      }
    }
    const duration = Date.now() - startTime;

    if (duration > 200) {
      console.warn(`⚠ Squad query took ${duration}ms (target: <200ms)`);
    }

    // Ensure is_captain is boolean and add any additional processing
    const players = result.rows.map(player => ({
      ...player,
      is_captain: player.is_captain === true || player.is_captain === 'true' || player.is_captain === 1
    }));

    res.json({
      success: true,
      team: teamCheck.rows[0].team_name,
      count: players.length,
      data: players,
      duration: `${duration}ms`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/clubs/:id/stats
 * Returns optimized club statistics with streaks/form data ordered by date
 * Includes aggregates for interactive frontend hovers/tooltips
 * 
 * @param {string} id - Club UUID
 * @returns {Object} Club statistics with match-by-match data, aggregates, and form
 */
router.get('/:id/stats', async (req, res, next) => {
  const startTime = Date.now();
  const pool = req.app.locals.pool;

  if (!pool) {
    return res.status(503).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  const { id } = req.params;

  try {
    // Accept both integer and UUID formats - let PostgreSQL handle type conversion
    // Verify team exists
    const teamCheck = await pool.query(
      'SELECT team_name FROM team WHERE team_id = $1',
      [id]
    );

    if (teamCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Optimized query: Get all matches for the team ordered by date
    // Calculate result, points, goals, and running totals in a single query
    const query = `
      WITH team_matches AS (
        SELECT 
          m.id AS match_id,
          m.date,
          m.home_team_id,
          m.away_team_id,
          m.home_team_score,
          m.away_team_score,
          h.team_name AS home_team_name,
          a.team_name AS away_team_name,
          CASE 
            WHEN m.home_team_id = $1 THEN 'home'
            ELSE 'away'
          END AS venue,
          CASE 
            WHEN m.home_team_id = $1 THEN m.home_team_score
            ELSE m.away_team_score
          END AS goals_for,
          CASE 
            WHEN m.home_team_id = $1 THEN m.away_team_score
            ELSE m.home_team_score
          END AS goals_against,
          CASE 
            WHEN (m.home_team_id = $1 AND m.home_team_score > m.away_team_score) OR 
                 (m.away_team_id = $1 AND m.away_team_score > m.home_team_score) THEN 'W'
            WHEN (m.home_team_id = $1 AND m.home_team_score < m.away_team_score) OR 
                 (m.away_team_id = $1 AND m.away_team_score < m.home_team_score) THEN 'L'
            ELSE 'D'
          END AS result,
          CASE 
            WHEN (m.home_team_id = $1 AND m.home_team_score > m.away_team_score) OR 
                 (m.away_team_id = $1 AND m.away_team_score > m.home_team_score) THEN 3
            WHEN (m.home_team_id = $1 AND m.home_team_score < m.away_team_score) OR 
                 (m.away_team_id = $1 AND m.away_team_score < m.home_team_score) THEN 0
            ELSE 1
          END AS points
        FROM matches m
        INNER JOIN team h ON m.home_team_id = h.team_id
        INNER JOIN team a ON m.away_team_id = a.team_id
        WHERE m.home_team_id = $1 OR m.away_team_id = $1
      ),
      matches_with_totals AS (
        SELECT 
          *,
          SUM(points) OVER (ORDER BY date, match_id) AS running_points,
          SUM(goals_for) OVER (ORDER BY date, match_id) AS running_goals_for,
          SUM(goals_against) OVER (ORDER BY date, match_id) AS running_goals_against,
          COUNT(*) OVER (ORDER BY date, match_id) AS matches_played,
          SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) OVER (ORDER BY date, match_id) AS running_wins,
          SUM(CASE WHEN result = 'D' THEN 1 ELSE 0 END) OVER (ORDER BY date, match_id) AS running_draws,
          SUM(CASE WHEN result = 'L' THEN 1 ELSE 0 END) OVER (ORDER BY date, match_id) AS running_losses
        FROM team_matches
      )
      SELECT 
        match_id,
        date,
        home_team_id,
        away_team_id,
        home_team_name,
        away_team_name,
        venue,
        home_team_score,
        away_team_score,
        goals_for,
        goals_against,
        goals_for - goals_against AS goal_difference,
        result,
        points,
        running_points,
        running_goals_for,
        running_goals_against,
        running_goals_for - running_goals_against AS running_goal_difference,
        matches_played,
        running_wins,
        running_draws,
        running_losses,
        -- Calculate current streak
        (
          SELECT result 
          FROM matches_with_totals m2 
          WHERE m2.date <= m1.date 
          ORDER BY m2.date DESC, m2.match_id DESC 
          LIMIT 1
        ) AS last_result,
        -- Form string (last 5 matches)
        (
          SELECT string_agg(result, '' ORDER BY date DESC, match_id DESC)
          FROM (
            SELECT result 
            FROM matches_with_totals m3 
            WHERE m3.date <= m1.date 
            ORDER BY m3.date DESC, m3.match_id DESC 
            LIMIT 5
          ) form_matches
        ) AS form
      FROM matches_with_totals m1
      ORDER BY date ASC, match_id ASC
    `;

    const result = await pool.query(query, [id]);
    const duration = Date.now() - startTime;

    // Calculate aggregates for tooltips and add logos
    const matches = result.rows.map(match => ({
      ...match,
      home_logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(match.home_team_name)}&background=38003C&color=fff&size=128`,
      away_logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(match.away_team_name)}&background=38003C&color=fff&size=128`
    }));
    
    const aggregates = matches.length > 0 ? {
      total_matches: matches.length,
      total_wins: matches.filter(m => m.result === 'W').length,
      total_draws: matches.filter(m => m.result === 'D').length,
      total_losses: matches.filter(m => m.result === 'L').length,
      total_goals_for: matches.reduce((sum, m) => sum + parseInt(m.goals_for), 0),
      total_goals_against: matches.reduce((sum, m) => sum + parseInt(m.goals_against), 0),
      total_points: matches.reduce((sum, m) => sum + parseInt(m.points), 0),
      current_form: matches.length >= 5 
        ? matches.slice(-5).map(m => m.result).join('')
        : matches.map(m => m.result).join(''),
      home_record: {
        wins: matches.filter(m => m.venue === 'home' && m.result === 'W').length,
        draws: matches.filter(m => m.venue === 'home' && m.result === 'D').length,
        losses: matches.filter(m => m.venue === 'home' && m.result === 'L').length
      },
      away_record: {
        wins: matches.filter(m => m.venue === 'away' && m.result === 'W').length,
        draws: matches.filter(m => m.venue === 'away' && m.result === 'D').length,
        losses: matches.filter(m => m.venue === 'away' && m.result === 'L').length
      }
    } : null;

    if (duration > 200) {
      console.warn(`⚠ Club stats query took ${duration}ms (target: <200ms)`);
    }

    res.json({
      success: true,
      team: teamCheck.rows[0].team_name,
      aggregates,
      matches: matches,
      count: matches.length,
      duration: `${duration}ms`
    });
  } catch (error) {
    next(error);
  }
});

export default router;

