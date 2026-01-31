/**
 * LLM Service for Premier League Analytics Hub
 * Provides RAG (Retrieval-Augmented Generation) functionality using OpenAI
 * 
 * Features:
 * - Generate embeddings for matches
 * - Retrieve relevant context from database
 * - Generate insights using club analytics timeseries data
 * - Season narrative generation
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configuration
const CONFIG = {
  embeddingModel: 'text-embedding-3-small',
  chatModel: process.env.LLM_MODEL || 'gpt-4-turbo-preview',
  temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.3'),
  maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '1000'),
  embeddingDimensions: 1536
};

/**
 * Generate embedding for a given text
 * 
 * @param {string} text - Text to generate embedding for
 * @returns {Promise<Array<number>>} Embedding vector
 */
export async function generateEmbedding(text) {
  try {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Invalid text input for embedding generation');
    }

    const response = await openai.embeddings.create({
      model: CONFIG.embeddingModel,
      input: text.trim()
    });

    if (!response.data || !response.data[0] || !response.data[0].embedding) {
      throw new Error('Invalid embedding response from OpenAI');
    }

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate embedding for a match
 * Creates a text representation of the match for embedding
 * 
 * @param {Object} match - Match object with teams, score, date, etc.
 * @returns {Promise<Array<number>>} Embedding vector
 */
export async function generateMatchEmbedding(match) {
  const text = `
    Match: ${match.home_team || 'Home Team'} vs ${match.away_team || 'Away Team'}
    Score: ${match.home_team_score || 0} - ${match.away_team_score || 0}
    Date: ${match.date || 'Unknown'}
    Matchweek: ${match.matchweek || 'N/A'}
    Attendance: ${match.attendance || 'N/A'}
    Venue: ${match.stadium_name || 'Unknown'}
  `.trim();

  return generateEmbedding(text);
}

/**
 * Search for similar matches using vector similarity
 * Note: This requires pgvector extension and match_embeddings table
 * 
 * @param {Object} pool - PostgreSQL connection pool
 * @param {Array<number>} queryEmbedding - Query embedding vector
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array<Object>>} Array of similar matches
 */
export async function searchSimilarMatches(pool, queryEmbedding, limit = 5) {
  try {
    // Check if pgvector extension and match_embeddings table exist
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'match_embeddings'
      );
    `);

    if (!checkTable.rows[0].exists) {
      console.log('match_embeddings table does not exist. Skipping vector search.');
      return [];
    }

    // Convert embedding array to PostgreSQL vector format
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const query = `
      SELECT 
        m.id AS match_id,
        m.date,
        m.home_team_score,
        m.away_team_score,
        m.matchweek,
        h.team_name AS home_team,
        a.team_name AS away_team,
        1 - (me.embedding <=> $1::vector) AS similarity
      FROM match_embeddings me
      INNER JOIN matches m ON me.match_id = m.id
      INNER JOIN team h ON m.home_team_id = h.team_id
      INNER JOIN team a ON m.away_team_id = a.team_id
      ORDER BY me.embedding <=> $1::vector
      LIMIT $2
    `;

    const result = await pool.query(query, [embeddingStr, limit]);
    return result.rows;
  } catch (error) {
    console.error('Error searching similar matches:', error);
    // If pgvector is not available, return empty array
    if (error.message.includes('operator does not exist') || error.message.includes('vector')) {
      console.log('pgvector extension not available. Skipping vector search.');
      return [];
    }
    throw error;
  }
}

/**
 * Generate club insights using analytics timeseries data
 * 
 * @param {Object} pool - PostgreSQL connection pool
 * @param {string} clubId - Club/Team ID
 * @returns {Promise<string>} Generated insights text
 */
export async function generateClubInsights(pool, clubId) {
  try {
    // Fetch club analytics timeseries data
    const analyticsQuery = `
      SELECT 
        matchweek,
        position,
        cumulative_points,
        cumulative_gd,
        cumulative_gf,
        cumulative_ga,
        result,
        venue,
        opponent_name
      FROM club_analytics_timeseries
      WHERE team_id = $1
      ORDER BY matchweek ASC
    `;

    const analyticsResult = await pool.query(analyticsQuery, [clubId]);
    const timeseriesData = analyticsResult.rows;

    if (!timeseriesData || timeseriesData.length === 0) {
      return "No analytics data available for this club.";
    }

    // Fetch club name
    const clubQuery = `
      SELECT team_name FROM team WHERE team_id = $1
    `;
    const clubResult = await pool.query(clubQuery, [clubId]);
    const clubName = clubResult.rows[0]?.team_name || 'Unknown Team';

    // Compress timeseries data for context
    const summary = summarizeTimeseries(timeseriesData);

    // Build prompt
    const systemPrompt = `You are an expert Premier League analyst. Analyze the provided club performance data and generate insights about:
- Performance trends (improvements, declines)
- Tactical patterns (attack vs defense balance)
- Key turning points in the season
- Comparison to league averages

Be specific with matchweeks, statistics, and dates.`;

    const userPrompt = `
Analyze the following club performance data:

Team: ${clubName}

Season Summary:
${summary}

Full Match-by-Match Data:
${JSON.stringify(timeseriesData, null, 2)}

Generate 3-5 insights about this team's season performance. Be concise but thorough.
`;

    const response = await openai.chat.completions.create({
      model: CONFIG.chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: CONFIG.temperature,
      max_tokens: CONFIG.maxTokens
    });

    return response.choices[0]?.message?.content || 'Unable to generate insights.';
  } catch (error) {
    console.error('Error generating club insights:', error);
    throw new Error(`Failed to generate club insights: ${error.message}`);
  }
}

/**
 * Generate season narrative from timeseries data
 * 
 * @param {Object} pool - PostgreSQL connection pool
 * @param {string} clubId - Club/Team ID
 * @returns {Promise<string>} Generated narrative text
 */
export async function generateSeasonNarrative(pool, clubId) {
  try {
    // Fetch full timeseries data
    const analyticsQuery = `
      SELECT 
        matchweek,
        position,
        cumulative_points,
        cumulative_gd,
        cumulative_gf,
        cumulative_ga,
        result,
        venue,
        opponent_name,
        goals_scored,
        goals_conceded
      FROM club_analytics_timeseries
      WHERE team_id = $1
      ORDER BY matchweek ASC
    `;

    const analyticsResult = await pool.query(analyticsQuery, [clubId]);
    const timeseriesData = analyticsResult.rows;

    if (!timeseriesData || timeseriesData.length === 0) {
      return "No season data available for this club.";
    }

    // Fetch club name and additional info
    const clubQuery = `
      SELECT t.team_name, t.founded_year, s.stadium_name
      FROM team t
      LEFT JOIN stadiums s ON t.stadium_id = s.id
      WHERE t.team_id = $1
    `;
    const clubResult = await pool.query(clubQuery, [clubId]);
    const club = clubResult.rows[0] || {};

    // Identify key moments
    const keyMoments = identifyKeyMoments(timeseriesData);

    // Build prompt
    const systemPrompt = `You are a Premier League match commentator. Generate a narrative summary of the season based on the provided data. Include:
- Key moments (biggest wins, position changes)
- Context (team form, league positions)
- Season significance (impact on standings, records)
- Engaging storytelling while staying factual.`;

    const userPrompt = `
Generate a season narrative for:

Team: ${club.team_name || 'Unknown'}
Founded: ${club.founded_year || 'N/A'}
Stadium: ${club.stadium_name || 'N/A'}

Key Moments:
${JSON.stringify(keyMoments, null, 2)}

Full Season Data (38 matchweeks):
${JSON.stringify(timeseriesData, null, 2)}

Generate a 4-6 sentence narrative of this team's 2023/24 season.
`;

    const response = await openai.chat.completions.create({
      model: CONFIG.chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: CONFIG.temperature,
      max_tokens: CONFIG.maxTokens * 2 // Longer narrative
    });

    return response.choices[0]?.message?.content || 'Unable to generate narrative.';
  } catch (error) {
    console.error('Error generating season narrative:', error);
    throw new Error(`Failed to generate season narrative: ${error.message}`);
  }
}

/**
 * Summarize timeseries data for context compression
 * 
 * @param {Array<Object>} timeseriesData - Full timeseries data
 * @returns {string} Compressed summary
 */
function summarizeTimeseries(timeseriesData) {
  if (!timeseriesData || timeseriesData.length === 0) {
    return 'No data available';
  }

  const first = timeseriesData[0];
  const last = timeseriesData[timeseriesData.length - 1];
  
  // Find position changes
  let positionChanges = [];
  let currentPosition = first.position;
  for (let i = 1; i < timeseriesData.length; i++) {
    if (timeseriesData[i].position !== currentPosition) {
      positionChanges.push({
        matchweek: timeseriesData[i].matchweek,
        from: currentPosition,
        to: timeseriesData[i].position
      });
      currentPosition = timeseriesData[i].position;
    }
  }

  // Find best and worst runs
  let wins = 0, losses = 0, draws = 0;
  timeseriesData.forEach(d => {
    if (d.result === 'W') wins++;
    else if (d.result === 'L') losses++;
    else if (d.result === 'D') draws++;
  });

  return `
- Started at position ${first.position}, finished at position ${last.position}
- Total: ${wins} wins, ${draws} draws, ${losses} losses
- Final points: ${last.cumulative_points}, GD: ${last.cumulative_gd}
- Goals: ${last.cumulative_gf} for, ${last.cumulative_ga} against
- Position changes: ${positionChanges.length} times
${positionChanges.length > 0 ? `- Key changes: ${positionChanges.slice(0, 3).map(c => `MW ${c.matchweek} (${c.from}→${c.to})`).join(', ')}` : ''}
  `.trim();
}

/**
 * Identify key moments in the season
 * 
 * @param {Array<Object>} timeseriesData - Full timeseries data
 * @returns {Array<Object>} Array of key moments
 */
function identifyKeyMoments(timeseriesData) {
  const moments = [];

  // Find biggest win (largest goal difference in a match)
  let biggestWin = null;
  let biggestWinDiff = -1;

  // Find position peaks and valleys
  let highestPosition = 20;
  let lowestPosition = 1;
  let highestPositionMW = null;
  let lowestPositionMW = null;

  timeseriesData.forEach((d, idx) => {
    // Track position extremes
    if (d.position < highestPosition) {
      highestPosition = d.position;
      highestPositionMW = d.matchweek;
    }
    if (d.position > lowestPosition) {
      lowestPosition = d.position;
      lowestPositionMW = d.matchweek;
    }

    // Calculate match goal difference
    const matchGD = (d.goals_scored || 0) - (d.goals_conceded || 0);
    if (d.result === 'W' && matchGD > biggestWinDiff) {
      biggestWinDiff = matchGD;
      biggestWin = {
        matchweek: d.matchweek,
        opponent: d.opponent_name,
        score: `${d.goals_scored}-${d.goals_conceded}`,
        venue: d.venue
      };
    }
  });

  if (highestPositionMW) {
    moments.push({
      type: 'peak_position',
      matchweek: highestPositionMW,
      position: highestPosition,
      description: `Reached highest position: ${highestPosition}`
    });
  }

  if (lowestPositionMW) {
    moments.push({
      type: 'lowest_position',
      matchweek: lowestPositionMW,
      position: lowestPosition,
      description: `Lowest position: ${lowestPosition}`
    });
  }

  if (biggestWin) {
    moments.push({
      type: 'biggest_win',
      ...biggestWin,
      description: `Biggest win: ${biggestWin.score} vs ${biggestWin.opponent}`
    });
  }

  return moments;
}

export default {
  generateEmbedding,
  generateMatchEmbedding,
  searchSimilarMatches,
  generateClubInsights,
  generateSeasonNarrative
};

