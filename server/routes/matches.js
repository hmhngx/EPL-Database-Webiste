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
        CASE 
          WHEN m.attendance IS NOT NULL THEN CAST(REPLACE(m.attendance::TEXT, ',', '') AS INTEGER)
          ELSE NULL
        END AS attendance,
        h.team_id AS home_team_id,
        h.team_name AS home_team,
        a.team_id AS away_team_id,
        a.team_name AS away_team,
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
      baseQuery += ` ORDER BY mg.gameweek_num ${orderDir}, m.date ASC, m.id ASC`;
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

    // Add logo URLs for teams
    const matches = queryResult.rows.map(match => ({
      ...match,
      home_logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(match.home_team)}&background=38003C&color=fff&size=128`,
      away_logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(match.away_team)}&background=38003C&color=fff&size=128`
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
        m.id AS match_id,
        m.date,
        m.home_team_score,
        m.away_team_score,
        CASE 
          WHEN m.attendance IS NOT NULL THEN CAST(REPLACE(m.attendance::TEXT, ',', '') AS INTEGER)
          ELSE NULL
        END AS attendance,
        h.team_id AS home_team_id,
        h.team_name AS home_team,
        a.team_id AS away_team_id,
        a.team_name AS away_team,
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

    if (duration > 200) {
      console.warn(`⚠ Match details query took ${duration}ms (target: <200ms)`);
    }

    // Add logo URLs for teams
    const match = result.rows[0];
    const matchData = {
      ...match,
      home_logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(match.home_team)}&background=38003C&color=fff&size=128`,
      away_logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(match.away_team)}&background=38003C&color=fff&size=128`
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

