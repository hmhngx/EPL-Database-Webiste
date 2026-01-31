/**
 * AI API Routes
 * POST /api/ai/club-analysis - Generate AI tactical analysis from timeseries data
 * POST /api/ai/match-summary - Generate AI match narrative summary
 */

import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Configuration
const CONFIG = {
  chatModel: process.env.LLM_MODEL || 'gpt-4-turbo-preview',
  temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.3'),
  maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '500')
};

// Lazy initialization of OpenAI client (only when needed)
let openai = null;

function getOpenAIClient() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

/**
 * POST /api/ai/club-analysis
 * Accepts timeseries analytics data and generates a 3-bullet point tactical analysis
 * 
 * @body {Array<Object>} timeseries - Array of timeseries data objects with:
 *   - matchweek: number
 *   - position: number
 *   - cumulative_gf: number (Goals For)
 *   - cumulative_ga: number (Goals Against)
 *   - [other fields optional]
 * 
 * @returns {Object} Analysis result with 3 bullet points
 */
router.post('/club-analysis', async (req, res, next) => {
  const startTime = Date.now();

  try {
    // Check if OpenAI API key is configured and get client
    let client;
    try {
      client = getOpenAIClient();
    } catch {
      return res.status(503).json({
        success: false,
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file.'
      });
    }

    const { timeseries } = req.body;

    // Validate input
    if (!timeseries || !Array.isArray(timeseries) || timeseries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'timeseries array is required and must not be empty'
      });
    }

    // Validate required fields in timeseries data
    const requiredFields = ['matchweek', 'position', 'cumulative_gf', 'cumulative_ga'];
    const missingFields = requiredFields.filter(field => 
      !Object.prototype.hasOwnProperty.call(timeseries[0], field)
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields in timeseries data: ${missingFields.join(', ')}`
      });
    }

    // System prompt as specified
    const systemPrompt = `You are a Premier League tactical analyst. Look at this timeseries data (Position, Goals For, Goals Against). Identify the biggest 'Slump' and the biggest 'Peak' in the season. Output exactly 3 bullet points.`;

    // Build user prompt with the timeseries data
    const userPrompt = `Analyze the following timeseries data and provide exactly 3 bullet points identifying the biggest slump and peak in the season:

${JSON.stringify(timeseries, null, 2)}

Format your response as exactly 3 bullet points, each starting with "• " or "- ". Focus on:
1. The biggest slump (worst period) - identify matchweek range and what made it the worst
2. The biggest peak (best period) - identify matchweek range and what made it the best
3. A tactical insight connecting the two periods or summarizing the season's trajectory`;

    // Call OpenAI API
    const response = await client.chat.completions.create({
      model: CONFIG.chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: CONFIG.temperature,
      max_tokens: CONFIG.maxTokens
    });

    const analysis = response.choices[0]?.message?.content || 'Unable to generate analysis.';
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        analysis,
        bulletPoints: parseBulletPoints(analysis)
      },
      duration: `${duration}ms`
    });

  } catch (error) {
    console.error('Error generating club analysis:', error);
    
    // Handle OpenAI API errors
    if (error.response) {
      return res.status(error.response.status || 500).json({
        success: false,
        error: `OpenAI API error: ${error.response.data?.error?.message || error.message}`
      });
    }

    next(error);
  }
});

/**
 * POST /api/ai/match-summary
 * Accepts match, events, and stats objects and generates a 2-paragraph dramatic match summary
 * 
 * @body {Object} match - Match object with teams, score, date, venue, etc.
 * @body {Array<Object>} events - Array of match events (goals, cards, substitutions, etc.)
 * @body {Object} stats - Match statistics object with home and away stats
 * 
 * @returns {Object} Summary result with narrative text
 */
router.post('/match-summary', async (req, res, next) => {
  const startTime = Date.now();

  try {
    // Check if OpenAI API key is configured and get client
    let client;
    try {
      client = getOpenAIClient();
    } catch {
      return res.status(503).json({
        success: false,
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file.'
      });
    }

    const { match, events, stats } = req.body;

    // Validate input
    if (!match || typeof match !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'match object is required'
      });
    }

    // System prompt as specified
    const systemPrompt = `You are a sports journalist. Write a 2-paragraph dramatic summary of this match. Paragraph 1: The flow of the game. Paragraph 2: The impact on the league. Use player names and match minutes.`;

    // Build user prompt with match data
    const userPrompt = `Write a dramatic 2-paragraph match summary for this Premier League match:

Match Information:
${JSON.stringify(match, null, 2)}

Match Events:
${JSON.stringify(events || [], null, 2)}

Match Statistics:
${JSON.stringify(stats || {}, null, 2)}

Write exactly 2 paragraphs:
1. First paragraph: Describe the flow of the game, key moments, goals, and how the match unfolded. Include player names and match minutes.
2. Second paragraph: Explain the impact of this result on the league standings, both teams' seasons, and any broader implications.

Make it dramatic and engaging, like a sports journalist would write.`;

    // Call OpenAI API with higher token limit for 2 paragraphs
    const response = await client.chat.completions.create({
      model: CONFIG.chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: CONFIG.temperature,
      max_tokens: 1000 // Increased for 2 paragraphs
    });

    const summary = response.choices[0]?.message?.content || 'Unable to generate match summary.';
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        summary
      },
      duration: `${duration}ms`
    });

  } catch (error) {
    console.error('Error generating match summary:', error);
    
    // Handle OpenAI API errors
    if (error.response) {
      return res.status(error.response.status || 500).json({
        success: false,
        error: `OpenAI API error: ${error.response.data?.error?.message || error.message}`
      });
    }

    next(error);
  }
});

/**
 * POST /api/ai/predict
 * Accepts full season aggregates for two teams and generates an AI match prediction
 * 
 * @body {Object} teamA - Team A data with:
 *   - team_name: string
 *   - goals_for: number (Goals For)
 *   - xg: number (Expected Goals, optional - can use goals_for as proxy)
 *   - recent_form: string (e.g., "WWDLW")
 *   - [other optional stats]
 * @body {Object} teamB - Team B data with same structure as teamA
 * 
 * @returns {Object} Prediction result with:
 *   - predicted_score: string (e.g., "2-1")
 *   - win_probabilities: { home: number, draw: number, away: number }
 *   - tactical_keys: Array<string> (3 tactical insights)
 */
router.post('/predict', async (req, res, next) => {
  const startTime = Date.now();

  try {
    // Check if OpenAI API key is configured and get client
    let client;
    try {
      client = getOpenAIClient();
    } catch {
      return res.status(503).json({
        success: false,
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file.'
      });
    }

    const { teamA, teamB } = req.body;

    // Validate input
    if (!teamA || !teamB || typeof teamA !== 'object' || typeof teamB !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'teamA and teamB objects are required'
      });
    }

    // Validate required fields
    const requiredFields = ['team_name', 'goals_for', 'recent_form'];
    const missingA = requiredFields.filter(field => !Object.prototype.hasOwnProperty.call(teamA, field));
    const missingB = requiredFields.filter(field => !Object.prototype.hasOwnProperty.call(teamB, field));

    if (missingA.length > 0 || missingB.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: Team A: ${missingA.join(', ') || 'none'}, Team B: ${missingB.join(', ') || 'none'}`
      });
    }

    // System prompt as specified
    const systemPrompt = `You are a data-driven sports analyst. Predict the score and 3 tactical keys for a match between Team A and Team B. Provide a Win/Draw/Loss percentage. Return JSON.`;

    // Build user prompt with team data
    const userPrompt = `Predict the outcome of a Premier League match between these two teams:

Team A (Home):
- Name: ${teamA.team_name}
- Goals For (season): ${teamA.goals_for}
- Expected Goals (xG): ${teamA.xg || teamA.goals_for || 'N/A'}
- Recent Form (last 5 matches): ${teamA.recent_form || 'N/A'}
${teamA.goals_against ? `- Goals Against: ${teamA.goals_against}` : ''}
${teamA.points ? `- Points: ${teamA.points}` : ''}

Team B (Away):
- Name: ${teamB.team_name}
- Goals For (season): ${teamB.goals_for}
- Expected Goals (xG): ${teamB.xg || teamB.goals_for || 'N/A'}
- Recent Form (last 5 matches): ${teamB.recent_form || 'N/A'}
${teamB.goals_against ? `- Goals Against: ${teamB.goals_against}` : ''}
${teamB.points ? `- Points: ${teamB.points}` : ''}

Provide your prediction in the following JSON format:
{
  "predicted_score": "2-1",
  "win_probabilities": {
    "home": 45,
    "draw": 25,
    "away": 30
  },
  "tactical_keys": [
    "First tactical insight about Team A's strengths or weaknesses",
    "Second tactical insight about Team B's approach or key players",
    "Third tactical insight about the match dynamics or head-to-head factors"
  ]
}

Ensure win_probabilities.home + win_probabilities.draw + win_probabilities.away = 100.
Return ONLY valid JSON, no additional text.`;

    // Call OpenAI API with higher token limit for detailed prediction
    const response = await client.chat.completions.create({
      model: CONFIG.chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: CONFIG.temperature,
      max_tokens: 800, // Increased for detailed prediction
      response_format: { type: 'json_object' } // Request JSON response
    });

    const predictionText = response.choices[0]?.message?.content || '{}';
    let prediction;

    try {
      prediction = JSON.parse(predictionText);
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = predictionText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        prediction = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    // Validate and normalize probabilities
    if (prediction.win_probabilities) {
      const { home, draw, away } = prediction.win_probabilities;
      const total = (home || 0) + (draw || 0) + (away || 0);
      if (total > 0) {
        // Normalize to 100
        prediction.win_probabilities = {
          home: Math.round((home || 0) * 100 / total),
          draw: Math.round((draw || 0) * 100 / total),
          away: Math.round((away || 0) * 100 / total)
        };
      }
    }

    // Ensure tactical_keys is an array
    if (!Array.isArray(prediction.tactical_keys)) {
      prediction.tactical_keys = [];
    }

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        teamA: teamA.team_name,
        teamB: teamB.team_name,
        predicted_score: prediction.predicted_score || 'N/A',
        win_probabilities: prediction.win_probabilities || { home: 33, draw: 34, away: 33 },
        tactical_keys: prediction.tactical_keys || []
      },
      duration: `${duration}ms`
    });

  } catch (error) {
    console.error('Error generating match prediction:', error);
    
    // Handle OpenAI API errors
    if (error.response) {
      return res.status(error.response.status || 500).json({
        success: false,
        error: `OpenAI API error: ${error.response.data?.error?.message || error.message}`
      });
    }

    next(error);
  }
});

/**
 * POST /api/ai/valuation
 * Accepts player data and generates market value estimation and club fit suggestions
 * 
 * @body {Object} player - Player data with:
 *   - age: number
 *   - position: string
 *   - minutes_played: number
 *   - goals: number
 *   - assists: number
 *   - sofascore_rating: number
 * 
 * @returns {Object} Valuation result with:
 *   - value: number (market value in EUR)
 *   - currency: string (e.g., "EUR")
 *   - fit_suggestions: Array<{club_name: string, logic: string}>
 */
router.post('/valuation', async (req, res, next) => {
  const startTime = Date.now();

  try {
    // Check if OpenAI API key is configured and get client
    let client;
    try {
      client = getOpenAIClient();
    } catch {
      return res.status(503).json({
        success: false,
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file.'
      });
    }

    const { age, position, minutes_played, goals, assists, sofascore_rating } = req.body;

    // Validate input
    if (age == null || !position || minutes_played == null || goals == null || assists == null || sofascore_rating == null) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: age, position, minutes_played, goals, assists, and sofascore_rating are required'
      });
    }

    // System prompt as specified
    const systemPrompt = `You are a football finance expert. Estimate this player's market value in today's market (EUR) and suggest 3 clubs that need a player of this profile. Return JSON with 'value', 'currency', and 'fit_suggestions' (club name + logic).`;

    // Build user prompt with player data
    const userPrompt = `Estimate the market value and suggest 3 clubs for this player:

Player Profile:
- Age: ${age} years
- Position: ${position}
- Minutes Played: ${minutes_played}
- Goals: ${goals}
- Assists: ${assists}
- SofaScore Rating: ${sofascore_rating}

Provide your analysis in the following JSON format:
{
  "value": 75400000,
  "currency": "EUR",
  "fit_suggestions": [
    {
      "club_name": "Club Name 1",
      "logic": "Brief explanation of why this club needs this player profile"
    },
    {
      "club_name": "Club Name 2",
      "logic": "Brief explanation of why this club needs this player profile"
    },
    {
      "club_name": "Club Name 3",
      "logic": "Brief explanation of why this club needs this player profile"
    }
  ]
}

Consider:
- Current market rates for players of similar age, position, and performance
- The player's age (younger players typically have higher potential value)
- Performance metrics (goals, assists, rating)
- Minutes played (indicates reliability and fitness)
- Position-specific market dynamics

Return ONLY valid JSON, no additional text.`;

    // Call OpenAI API with JSON response format
    const response = await client.chat.completions.create({
      model: CONFIG.chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: CONFIG.temperature,
      max_tokens: 800, // Increased for detailed valuation
      response_format: { type: 'json_object' } // Request JSON response
    });

    const valuationText = response.choices[0]?.message?.content || '{}';
    let valuation;

    try {
      valuation = JSON.parse(valuationText);
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = valuationText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        valuation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    // Validate and normalize response
    if (!valuation.value || typeof valuation.value !== 'number') {
      valuation.value = 0;
    }
    if (!valuation.currency) {
      valuation.currency = 'EUR';
    }
    if (!Array.isArray(valuation.fit_suggestions)) {
      valuation.fit_suggestions = [];
    }
    // Ensure exactly 3 suggestions
    if (valuation.fit_suggestions.length > 3) {
      valuation.fit_suggestions = valuation.fit_suggestions.slice(0, 3);
    }
    // Validate each suggestion has required fields
    valuation.fit_suggestions = valuation.fit_suggestions
      .filter(s => s.club_name && s.logic)
      .slice(0, 3);

    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        value: valuation.value,
        currency: valuation.currency,
        fit_suggestions: valuation.fit_suggestions
      },
      duration: `${duration}ms`
    });

  } catch (error) {
    console.error('Error generating player valuation:', error);
    
    // Handle OpenAI API errors
    if (error.response) {
      return res.status(error.response.status || 500).json({
        success: false,
        error: `OpenAI API error: ${error.response.data?.error?.message || error.message}`
      });
    }

    next(error);
  }
});

/**
 * Parse bullet points from the AI response
 * Extracts individual bullet points from the analysis text
 * 
 * @param {string} analysis - The full analysis text
 * @returns {Array<string>} Array of bullet point strings
 */
function parseBulletPoints(analysis) {
  if (!analysis) return [];

  // Match bullet points starting with •, -, or numbered lists
  const bulletRegex = /(?:^|\n)[•\-*]\s*(.+?)(?=\n(?:[•\-*]|$)|$)/g;
  const matches = [...analysis.matchAll(bulletRegex)];
  
  if (matches.length > 0) {
    return matches.map(match => match[1].trim());
  }

  // Fallback: split by newlines and filter empty
  return analysis
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')))
    .map(line => line.replace(/^[•\-*]\s*/, '').trim());
}

/**
 * POST /api/ai/archive-rag
 * RAG (Retrieval-Augmented Generation) endpoint for Archive queries
 * Accepts a user query and context documents, returns AI response with citations
 * 
 * @body {string} query - User's question about the archive
 * @body {Array<Object>} context - Array of document objects with:
 *   - id: number
 *   - date: string
 *   - speaker: string
 *   - content: string
 *   - tags: Array<string>
 * 
 * @returns {Object} Response with answer and source citations
 */
router.post('/archive-rag', async (req, res, next) => {
  const startTime = Date.now();

  try {
    // Check if OpenAI API key is configured and get client
    let client;
    try {
      client = getOpenAIClient();
    } catch {
      return res.status(503).json({
        success: false,
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file.'
      });
    }

    const { query, context } = req.body;

    // Validate input
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: 'query is required and must be a non-empty string'
      });
    }

    if (!context || !Array.isArray(context) || context.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'context is required and must be a non-empty array'
      });
    }

    // Build context string from documents
    const contextString = context.map((doc, idx) => {
      return `[Document #${doc.id}, ${doc.date}]\nSpeaker: ${doc.speaker}\nTags: ${doc.tags?.join(', ') || 'N/A'}\nContent: ${doc.content}\n`;
    }).join('\n---\n\n');

    // System prompt for RAG
    const systemPrompt = `You are a research assistant analyzing historical football manager transcripts from the Premier League Archive. 
Your role is to answer questions based on the provided document context. Always cite specific documents using the format [Doc #ID, YYYY] when referencing information.

Guidelines:
- Base your answers ONLY on the provided context documents
- If information is not in the context, say so clearly
- Always include document citations in your response
- Be precise and analytical
- Compare different managers' views when relevant
- Highlight tactical patterns, controversies, or notable statements`;

    // User prompt with context
    const userPrompt = `Context Documents (${context.length} total):

${contextString}

User Question: ${query}

Please provide a detailed answer based on the context above. Include specific document citations like [Doc #4, 2023] when referencing information.`;

    // Call OpenAI API
    const completion = await client.chat.completions.create({
      model: CONFIG.chatModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: CONFIG.temperature,
      max_tokens: parseInt(process.env.LLM_MAX_TOKENS || '1000')
    });

    const answer = completion.choices[0]?.message?.content || 'No response generated';

    // Extract source citations from the answer
    const citationRegex = /\[Doc\s+#?(\d+),\s*(\d{4})\]/gi;
    const citations = [];
    let match;
    while ((match = citationRegex.exec(answer)) !== null) {
      const docId = parseInt(match[1]);
      const date = match[2];
      if (!citations.find(c => c.docId === docId)) {
        citations.push({ docId, date });
      }
    }

    // If no citations found but documents exist, include top 3 most relevant
    if (citations.length === 0 && context.length > 0) {
      citations.push(...context.slice(0, 3).map(doc => ({
        docId: doc.id,
        date: doc.date.split('-')[0]
      })));
    }

    const duration = Date.now() - startTime;

    return res.json({
      success: true,
      data: {
        answer,
        sources: citations,
        contextCount: context.length
      },
      duration: `${duration}ms`
    });

  } catch (error) {
    console.error('Archive RAG error:', error);

    if (error.response) {
      return res.status(error.response.status || 500).json({
        success: false,
        error: `OpenAI API error: ${error.response.data?.error?.message || error.message}`
      });
    }

    next(error);
  }
});

export default router;
