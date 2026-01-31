/**
 * Matches API Routes
 * GET /api/matches - Get all matches with advanced filters and optimized data
 * GET /api/matches/:id - Get specific match details
 */

import express from 'express';
const router = express.Router();

/**
 * GET /api/matches
 * Returns all matches with advanced filters and optimized/pre-aggregated data for charts
 * 
 * Query parameters:
 *   - gameweek: Filter matches by gameweek (1-38)
 *   - club: Filter matches by club ID (UUID)
 *   - dateFrom: Filter matches from date (ISO format: YYYY-MM-DD)
 *   - dateTo: Filter matches to date (ISO format: YYYY-MM-DD)
 *   - result: Filter by result type ('win', 'loss', 'draw') - requires club param
 *   - venue: Filter by venue ('home', 'away') - requires club param
 *   - aggregate: Return aggregated data for charts ('true'/'false', default: 'false')
 *   - limit: Limit number of results (default: all)
 *   - orderBy: Order by field ('date', 'goals', default: 'date')
 *   - order: Order direction ('asc', 'desc', default: 'desc')
 * 
 * @returns {Object} Matches data with optional aggregates for charts
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

  const { 
    gameweek, 
    club, 
    dateFrom, 
    dateTo, 
    result, 
    venue, 
    aggregate, 
    limit,
    orderBy = 'date',
    order = 'asc'
  } = req.query;

  try {
    const queryParams = [];
    let paramCounter = 1;
    const conditions = [];
    let clubParamIndex = null;

    // Base query with optimized joins
    let baseQuery = `
      SELECT 
        m.id AS match_id,
        m.date,
        m.matchweek,
        m.home_team_score,
        m.away_team_score,
        m.youtube_id,
        CASE 
          WHEN m.attendance IS NOT NULL THEN CAST(REPLACE(m.attendance::TEXT, ',', '') AS INTEGER)
          ELSE NULL
        END AS attendance,
        h.team_id AS home_team_id,
        h.team_name AS home_team,
        h.logo_url AS home_logo_url,
        a.team_id AS away_team_id,
        a.team_name AS away_team,
        a.logo_url AS away_logo_url,
        s.stadium_name,
        s.capacity AS stadium_capacity,
        -- Pre-calculate result for home team
        CASE 
          WHEN m.home_team_score > m.away_team_score THEN 'home_win'
          WHEN m.away_team_score > m.home_team_score THEN 'away_win'
          ELSE 'draw'
        END AS result_type,
        -- Pre-calculate total goals for aggregation
        m.home_team_score + m.away_team_score AS total_goals,
        -- Pre-calculate goal difference
        ABS(m.home_team_score - m.away_team_score) AS goal_difference
      FROM matches m
      INNER JOIN team h ON m.home_team_id = h.team_id
      INNER JOIN team a ON m.away_team_id = a.team_id
      LEFT JOIN stadiums s ON h.stadium_id = s.id
    `;

    // Filter by gameweek
    if (gameweek) {
      const gameweekNum = parseInt(gameweek, 10);
      if (isNaN(gameweekNum) || gameweekNum < 1 || gameweekNum > 38) {
        return res.status(400).json({
          success: false,
          error: 'Invalid gameweek. Must be a number between 1 and 38.'
        });
      }
      conditions.push(`m.matchweek = $${paramCounter}`);
      queryParams.push(gameweekNum);
      paramCounter++;
    }

    // Filter by club
    if (club) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(club)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid club ID format. Expected UUID.'
        });
      }
      clubParamIndex = paramCounter;
      conditions.push(`(m.home_team_id = $${paramCounter} OR m.away_team_id = $${paramCounter})`);
      queryParams.push(club);
      paramCounter++;
    }

    // Filter by date range
    if (dateFrom) {
      conditions.push(`DATE(m.date) >= $${paramCounter}`);
      queryParams.push(dateFrom);
      paramCounter++;
    }

    if (dateTo) {
      conditions.push(`DATE(m.date) <= $${paramCounter}`);
      queryParams.push(dateTo);
      paramCounter++;
    }

    // Filter by result (requires club param)
    if (result && club && clubParamIndex) {
      const resultLower = result.toLowerCase();
      if (resultLower === 'win') {
        conditions.push(`(
          (m.home_team_id = $${clubParamIndex} AND m.home_team_score > m.away_team_score) OR
          (m.away_team_id = $${clubParamIndex} AND m.away_team_score > m.home_team_score)
        )`);
      } else if (resultLower === 'loss') {
        conditions.push(`(
          (m.home_team_id = $${clubParamIndex} AND m.home_team_score < m.away_team_score) OR
          (m.away_team_id = $${clubParamIndex} AND m.away_team_score < m.home_team_score)
        )`);
      } else if (resultLower === 'draw') {
        conditions.push(`m.home_team_score = m.away_team_score`);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid result filter. Must be "win", "loss", or "draw".'
        });
      }
    }

    // Filter by venue (requires club param)
    if (venue && club && clubParamIndex) {
      const venueLower = venue.toLowerCase();
      if (venueLower === 'home') {
        conditions.push(`m.home_team_id = $${clubParamIndex}`);
      } else if (venueLower === 'away') {
        conditions.push(`m.away_team_id = $${clubParamIndex}`);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid venue filter. Must be "home" or "away".'
        });
      }
    }

    // Build WHERE clause
    if (conditions.length > 0) {
      baseQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Order by - default to ordering by matchweek ascending (GW 1 first, then GW 38)
    const validOrderBy = ['date', 'goals', 'total_goals', 'goal_difference', 'matchweek', 'attendance'];
    const orderByField = validOrderBy.includes(orderBy.toLowerCase()) 
      ? orderBy.toLowerCase() === 'goals' ? 'total_goals' : orderBy.toLowerCase()
      : 'matchweek'; // Default to matchweek instead of date
    const orderDir = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    if (orderByField === 'date') {
      baseQuery += ` ORDER BY m.date ${orderDir}, m.id ${orderDir}`;
    } else if (orderByField === 'matchweek') {
      // Order by matchweek first, then by date within each matchweek
      baseQuery += ` ORDER BY m.matchweek ${orderDir}, m.date ASC, m.id ASC`;
    } else if (orderByField === 'attendance') {
      // Handle attendance sorting with comma removal
      baseQuery += ` ORDER BY CAST(REPLACE(COALESCE(m.attendance::TEXT, '0'), ',', '') AS INTEGER) ${orderDir}, m.date ${orderDir}`;
    } else {
      baseQuery += ` ORDER BY ${orderByField} ${orderDir}, m.date ${orderDir}`;
    }

    // Limit
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        baseQuery += ` LIMIT $${paramCounter}`;
        queryParams.push(limitNum);
      }
    }

    // Execute query
    const queryResult = await pool.query(
      baseQuery, 
      queryParams.length > 0 ? queryParams : undefined
    );
    const duration = Date.now() - startTime;

    // Use logo URLs from database if available, otherwise fallback to ui-avatars
    const matches = queryResult.rows.map(match => ({
      ...match,
      home_logo: match.home_logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(match.home_team)}&background=38003C&color=fff&size=128`,
      away_logo: match.away_logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(match.away_team)}&background=38003C&color=fff&size=128`
    }));

    // Build response
    const response = {
      success: true,
      count: matches.length,
      data: matches,
      duration: `${duration}ms`
    };

    // Add aggregates for charts if requested
    if (aggregate === 'true' && matches.length > 0) {
      
      // Calculate aggregates for smooth chart rendering
      const aggregates = {
        total_matches: matches.length,
        total_goals: matches.reduce((sum, m) => sum + parseInt(m.total_goals || 0), 0),
        avg_goals_per_match: (matches.reduce((sum, m) => sum + parseInt(m.total_goals || 0), 0) / matches.length).toFixed(2),
        results: {
          home_wins: matches.filter(m => m.result_type === 'home_win').length,
          away_wins: matches.filter(m => m.result_type === 'away_win').length,
          draws: matches.filter(m => m.result_type === 'draw').length
        },
        goals_by_match: matches.map((m, idx) => ({
          match_number: idx + 1,
          date: m.date,
          total_goals: parseInt(m.total_goals || 0),
          home_goals: parseInt(m.home_team_score || 0),
          away_goals: parseInt(m.away_team_score || 0)
        })),
        goals_by_date: matches.reduce((acc, m) => {
          const date = m.date.split('T')[0]; // Get date part only
          if (!acc[date]) {
            acc[date] = { date, total: 0, matches: 0 };
          }
          acc[date].total += parseInt(m.total_goals || 0);
          acc[date].matches += 1;
          return acc;
        }, {}),
        // Running totals for trend lines
        running_totals: matches.map((m, idx) => {
          const previous = idx > 0 ? matches.slice(0, idx) : [];
          return {
            match_number: idx + 1,
            date: m.date,
            running_total_goals: previous.reduce((sum, pm) => sum + parseInt(pm.total_goals || 0), 0) + parseInt(m.total_goals || 0),
            running_avg_goals: ((previous.reduce((sum, pm) => sum + parseInt(pm.total_goals || 0), 0) + parseInt(m.total_goals || 0)) / (idx + 1)).toFixed(2)
          };
        })
      };

      response.aggregates = aggregates;
    }

    // Add filter info
    if (gameweek || club || dateFrom || dateTo || result || venue) {
      response.filters = {
        gameweek: gameweek || null,
        club: club || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        result: result || null,
        venue: venue || null
      };
    }

    if (duration > 200) {
      console.warn(`⚠ Matches query took ${duration}ms (target: <200ms)`);
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/matches/:id/h2h
 * Returns head-to-head comparison data for a match
 * Includes: average stats up to match date, last 5 games form, win probability
 * 
 * NOTE: This route must be defined BEFORE /:id to ensure proper routing
 */
router.get('/:id/h2h', async (req, res, next) => {
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
    // First, get the match details to get team IDs and match date
    const matchQuery = `
      SELECT 
        m.id AS match_id,
        m.date,
        m.home_team_id,
        m.away_team_id,
        h.team_name AS home_team_name,
        a.team_name AS away_team_name
      FROM matches m
      INNER JOIN team h ON m.home_team_id = h.team_id
      INNER JOIN team a ON m.away_team_id = a.team_id
      WHERE m.id = $1
    `;

    const matchResult = await pool.query(matchQuery, [id]);
    
    if (matchResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }

    const match = matchResult.rows[0];
    const matchDate = match.date;
    const homeTeamId = match.home_team_id;
    const awayTeamId = match.away_team_id;

    // Fetch average match_stats for both teams up to this match date
    const statsQuery = `
      WITH team_matches AS (
        SELECT 
          m.id AS match_id,
          m.date,
          m.home_team_id,
          m.away_team_id,
          CASE 
            WHEN m.home_team_id = $1 THEN m.home_team_score
            ELSE m.away_team_score
          END AS team_score,
          CASE 
            WHEN m.home_team_id = $1 THEN m.away_team_score
            ELSE m.home_team_score
          END AS opponent_score,
          CASE 
            WHEN (m.home_team_id = $1 AND m.home_team_score > m.away_team_score) OR 
                 (m.away_team_id = $1 AND m.away_team_score > m.home_team_score) THEN 'W'
            WHEN (m.home_team_id = $1 AND m.home_team_score < m.away_team_score) OR 
                 (m.away_team_id = $1 AND m.away_team_score < m.home_team_score) THEN 'L'
            ELSE 'D'
          END AS result
        FROM matches m
        WHERE (m.home_team_id = $1 OR m.away_team_id = $1)
          AND m.date < $2
          AND m.id != $3
      )
      SELECT 
        AVG(ms.possession_pct) AS avg_possession,
        AVG(ms.total_shots) AS avg_shots,
        AVG(ms.accurate_passes) AS avg_passes,
        COUNT(DISTINCT ms.match_id) AS matches_count
      FROM match_stats ms
      INNER JOIN team_matches tm ON ms.match_id = tm.match_id
      WHERE ms.team_id = $1
    `;

    // Get stats for home team
    const homeStatsResult = await pool.query(statsQuery, [homeTeamId, matchDate, id]);
    const homeStats = homeStatsResult.rows[0] || {
      avg_possession: null,
      avg_shots: null,
      avg_passes: null,
      matches_count: 0
    };

    // Get stats for away team
    const awayStatsResult = await pool.query(statsQuery, [awayTeamId, matchDate, id]);
    const awayStats = awayStatsResult.rows[0] || {
      avg_possession: null,
      avg_shots: null,
      avg_passes: null,
      matches_count: 0
    };

    // Fetch last 5 games form for both teams
    const formQuery = `
      WITH team_matches AS (
        SELECT 
          m.id AS match_id,
          m.date,
          CASE 
            WHEN (m.home_team_id = $1 AND m.home_team_score > m.away_team_score) OR 
                 (m.away_team_id = $1 AND m.away_team_score > m.home_team_score) THEN 'W'
            WHEN (m.home_team_id = $1 AND m.home_team_score < m.away_team_score) OR 
                 (m.away_team_id = $1 AND m.away_team_score < m.home_team_score) THEN 'L'
            ELSE 'D'
          END AS result
        FROM matches m
        WHERE (m.home_team_id = $1 OR m.away_team_id = $1)
          AND m.date < $2
          AND m.id != $3
        ORDER BY m.date DESC, m.id DESC
        LIMIT 5
      )
      SELECT string_agg(result, '' ORDER BY date DESC, match_id DESC) AS form
      FROM team_matches
    `;

    const homeFormResult = await pool.query(formQuery, [homeTeamId, matchDate, id]);
    const awayFormResult = await pool.query(formQuery, [awayTeamId, matchDate, id]);

    const homeForm = homeFormResult.rows[0]?.form || '';
    const awayForm = awayFormResult.rows[0]?.form || '';

    // Calculate win probability based on form
    const calculateFormPoints = (form) => {
      let points = 0;
      for (const result of form) {
        if (result === 'W') points += 3;
        else if (result === 'D') points += 1;
      }
      return points;
    };

    const homeFormPoints = calculateFormPoints(homeForm);
    const awayFormPoints = calculateFormPoints(awayForm);
    const totalFormPoints = homeFormPoints + awayFormPoints;

    let homeWinProb = 33;
    let awayWinProb = 33;
    let drawProb = 34;

    if (totalFormPoints > 0) {
      const formDiff = homeFormPoints - awayFormPoints;
      const baseHomeAdvantage = 5;
      
      homeWinProb = Math.max(25, Math.min(50, 35 + (formDiff * 2) + baseHomeAdvantage));
      awayWinProb = Math.max(25, Math.min(50, 35 - (formDiff * 2)));
      drawProb = 100 - homeWinProb - awayWinProb;
      
      if (drawProb < 20) {
        const adjustment = (20 - drawProb) / 2;
        homeWinProb = Math.max(25, homeWinProb - adjustment);
        awayWinProb = Math.max(25, awayWinProb - adjustment);
        drawProb = 100 - homeWinProb - awayWinProb;
      }
    }

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        home: {
          team_id: homeTeamId,
          team_name: match.home_team_name,
          avg_possession: homeStats.avg_possession ? parseFloat(homeStats.avg_possession) : null,
          avg_shots: homeStats.avg_shots ? parseFloat(homeStats.avg_shots) : null,
          avg_passes: homeStats.avg_passes ? parseFloat(homeStats.avg_passes) : null,
          matches_count: parseInt(homeStats.matches_count) || 0,
          form: homeForm,
          form_points: homeFormPoints,
          win_probability: homeWinProb
        },
        away: {
          team_id: awayTeamId,
          team_name: match.away_team_name,
          avg_possession: awayStats.avg_possession ? parseFloat(awayStats.avg_possession) : null,
          avg_shots: awayStats.avg_shots ? parseFloat(awayStats.avg_shots) : null,
          avg_passes: awayStats.avg_passes ? parseFloat(awayStats.avg_passes) : null,
          matches_count: parseInt(awayStats.matches_count) || 0,
          form: awayForm,
          form_points: awayFormPoints,
          win_probability: awayWinProb
        },
        draw_probability: drawProb
      },
      duration: `${duration}ms`
    });
  } catch (error) {
    console.error('Error fetching H2H data:', error);
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

  if (!pool) {
    return res.status(503).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  const { id } = req.params;

  try {
    // Accept both integer and UUID formats - let PostgreSQL handle type conversion
    // If it's a valid integer, use it as-is; if it's a UUID, use it as-is
    const query = `
      SELECT 
        m.id AS match_id,
        m.date,
        m.matchweek,
        m.home_team_score,
        m.away_team_score,
        m.youtube_id,
        CASE 
          WHEN m.attendance IS NOT NULL THEN CAST(REPLACE(m.attendance::TEXT, ',', '') AS INTEGER)
          ELSE NULL
        END AS attendance,
        h.team_id AS home_team_id,
        h.team_name AS home_team,
        h.logo_url AS home_logo_url,
        a.team_id AS away_team_id,
        a.team_name AS away_team,
        a.logo_url AS away_logo_url,
        s.stadium_name,
        s.capacity AS stadium_capacity
      FROM matches m
      INNER JOIN team h ON m.home_team_id = h.team_id
      INNER JOIN team a ON m.away_team_id = a.team_id
      LEFT JOIN stadiums s ON h.stadium_id = s.id
      WHERE m.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    const duration = Date.now() - startTime;

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }

    // Try to fetch match events (table may not exist or may have different column names)
    let matchEvents = [];
    try {
      // Check what columns exist in match_events table
      const checkColumnsQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'match_events'
      `;
      const columnsResult = await pool.query(checkColumnsQuery);
      const availableColumns = columnsResult.rows.map(row => row.column_name);
      
      // Determine which columns to select
      const hasMinute = availableColumns.some(col => ['minute', 'clock_minute', 'event_minute'].includes(col));
      const minuteColumn = hasMinute 
        ? availableColumns.find(col => ['minute', 'clock_minute', 'event_minute'].includes(col))
        : null;
      const hasPlayerName = availableColumns.includes('player_name');
      const hasPlayerId = availableColumns.includes('player_id');
      const hasTeamName = availableColumns.includes('team_name');
      const hasTeamId = availableColumns.includes('team_id');
      
      // Build SELECT clause dynamically based on available columns
      // Use 'me' alias for all match_events columns
      const selectParts = [];
      if (minuteColumn) {
        selectParts.push(`me.${minuteColumn} AS minute`);
      }
      if (hasPlayerId) {
        selectParts.push('me.player_id');
      }
      if (hasPlayerName) {
        selectParts.push('me.player_name');
      }
      selectParts.push('me.event_type');
      
      // Add is_penalty and is_own_goal if they exist
      const hasIsPenalty = availableColumns.includes('is_penalty');
      const hasIsOwnGoal = availableColumns.includes('is_own_goal');
      if (hasIsPenalty) {
        selectParts.push('me.is_penalty');
      }
      if (hasIsOwnGoal) {
        selectParts.push('me.is_own_goal');
      }
      
      // Always use alias 'me' for match_events table for consistency
      let fromClause = 'FROM match_events me';
      if (!hasTeamName && hasTeamId) {
        selectParts.push('t.team_name');
        fromClause = 'FROM match_events me LEFT JOIN team t ON me.team_id = t.team_id';
      } else if (hasTeamName) {
        selectParts.push('me.team_name');
      }
      
      // Use alias 'me' consistently in ORDER BY and WHERE clauses
      const orderBy = minuteColumn ? `ORDER BY me.${minuteColumn} ASC, me.id ASC` : 'ORDER BY me.id ASC';
      const whereClause = 'WHERE me.match_id = $1';
      
      const eventsQuery = `
        SELECT ${selectParts.join(', ')}
        ${fromClause}
        ${whereClause}
        ${orderBy}
      `;
      
      const eventsResult = await pool.query(eventsQuery, [id]);
      matchEvents = eventsResult.rows.map(row => ({
        ...row,
        minute: row.minute || null,
        player_id: row.player_id || null,
        team_name: row.team_name || null,
        player_name: row.player_name || null,
        is_penalty: row.is_penalty || false,
        is_own_goal: row.is_own_goal || false
      }));
    } catch (err) {
      // match_events table may not exist, ignore error
    }

    // Try to fetch match stats for both teams
    let matchStats = { home: null, away: null };
    try {
      const statsQuery = `
        SELECT 
          ms.team_id,
          ms.formation,
          ms.possession_pct,
          ms.shots_on_target,
          ms.total_shots,
          ms.accurate_passes,
          ms.corners,
          ms.fouls_committed,
          ms.saves
        FROM match_stats ms
        WHERE ms.match_id = $1
      `;
      
      const statsResult = await pool.query(statsQuery, [id]);
      
      if (statsResult.rows.length > 0) {
        const match = result.rows[0];
        statsResult.rows.forEach(stat => {
          if (stat.team_id === match.home_team_id) {
            matchStats.home = stat;
          } else if (stat.team_id === match.away_team_id) {
            matchStats.away = stat;
          }
        });
      }
    } catch (err) {
      // match_stats table may not exist, ignore error
    }

    if (duration > 200) {
      console.warn(`⚠ Match details query took ${duration}ms (target: <200ms)`);
    }

    // Use logo URLs from database if available, otherwise fallback to ui-avatars
    const match = result.rows[0];
    const matchData = {
      ...match,
      home_logo: match.home_logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(match.home_team)}&background=38003C&color=fff&size=128`,
      away_logo: match.away_logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(match.away_team)}&background=38003C&color=fff&size=128`,
      match_events: matchEvents,
      match_stats: matchStats
    };

    res.json({
      success: true,
      data: matchData,
      duration: `${duration}ms`
    });
  } catch (error) {
    next(error);
  }
});

export default router;

