/**
 * Player Scout Service for Career Path Prediction
 * 
 * Features:
 * - Age-curve analysis and career trajectory prediction
 * - Historical precedents using similarity matching
 * - Market value projection over 5 years
 * - Dual player comparison for squad fit analysis
 */

import OpenAI from 'openai';

// Initialize OpenAI client
// Environment variables are loaded by server.js
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configuration
const CONFIG = {
  chatModel: process.env.LLM_MODEL || 'gpt-4-turbo-preview',
  temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.3'),
  maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '1500')
};

// Age-curve data based on position (statistical averages)
const AGE_CURVES = {
  'Goalkeeper': {
    peakAge: 30,
    developmentPeriod: [18, 25],
    peakPeriod: [26, 34],
    declinePeriod: [35, 40],
    peakMultiplier: 1.15
  },
  'Defender': {
    peakAge: 28,
    developmentPeriod: [18, 24],
    peakPeriod: [25, 31],
    declinePeriod: [32, 36],
    peakMultiplier: 1.20
  },
  'Midfielder': {
    peakAge: 27,
    developmentPeriod: [18, 23],
    peakPeriod: [24, 30],
    declinePeriod: [31, 35],
    peakMultiplier: 1.25
  },
  'Forward': {
    peakAge: 26,
    developmentPeriod: [18, 22],
    peakPeriod: [23, 29],
    declinePeriod: [30, 34],
    peakMultiplier: 1.30
  }
};

/**
 * Calculate age-curve projection for a player
 * 
 * @param {Object} player - Player object with age, position, and stats
 * @returns {Object} Age-curve analysis with peak year prediction
 */
export function calculateAgeCurve(player) {
  const { age, position, sofascore_rating } = player;
  const curve = AGE_CURVES[position] || AGE_CURVES['Midfielder'];
  
  const currentRating = parseFloat(sofascore_rating) || 6.5;
  const yearsUntilPeak = curve.peakAge - age;
  
  let phase = 'development';
  let projectedPeakRating = currentRating;
  
  if (age >= curve.declinePeriod[0]) {
    phase = 'decline';
    // In decline phase, current rating is likely at or past peak
    projectedPeakRating = currentRating;
  } else if (age >= curve.peakPeriod[0] && age <= curve.peakPeriod[1]) {
    phase = 'peak';
    // In peak phase, slight improvement possible
    projectedPeakRating = currentRating * 1.05;
  } else if (age < curve.peakPeriod[0]) {
    phase = 'development';
    // Calculate projected peak based on current rating and expected growth
    const progressInDevelopment = (age - curve.developmentPeriod[0]) / 
                                  (curve.peakPeriod[0] - curve.developmentPeriod[0]);
    const remainingGrowth = 1 - Math.max(0, Math.min(1, progressInDevelopment));
    projectedPeakRating = currentRating * (1 + (curve.peakMultiplier - 1) * remainingGrowth);
  }
  
  const potentialIncrease = ((projectedPeakRating - currentRating) / currentRating * 100).toFixed(1);
  
  return {
    currentAge: age,
    peakAge: curve.peakAge,
    yearsUntilPeak,
    currentPhase: phase,
    currentRating: currentRating.toFixed(2),
    projectedPeakRating: projectedPeakRating.toFixed(2),
    potentialIncrease: `${potentialIncrease}%`,
    description: `Historically, ${position}s with ${player.player_name}'s profile at age ${age} peak at age ${curve.peakAge} with approximately ${potentialIncrease}% improvement in performance.`
  };
}

/**
 * Find similar players based on statistical profile
 * Uses cosine similarity on normalized stats
 * 
 * @param {Object} pool - PostgreSQL connection pool
 * @param {Object} targetPlayer - Target player to find comparisons for
 * @param {number} limit - Number of similar players to return
 * @returns {Promise<Array>} Array of similar players with similarity scores
 */
export async function findHistoricalPrecedents(pool, targetPlayer, limit = 3) {
  try {
    // Get all players in the same position with complete stats
    const query = `
      SELECT 
        p.id,
        p.player_name,
        p.position,
        p.age,
        p.nationality,
        p.goals,
        p.assists,
        p.xg,
        p.xag,
        p.progressive_passes,
        p.appearances,
        p.minutes_played,
        p.sofascore_rating,
        t.team_name,
        t.logo_url
      FROM players p
      INNER JOIN team t ON p.team_id = t.team_id
      WHERE p.position = $1
        AND p.id != $2
        AND p.sofascore_rating IS NOT NULL
        AND p.appearances > 10
      ORDER BY p.sofascore_rating DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query, [targetPlayer.position, targetPlayer.id]);
    const candidates = result.rows;
    
    if (candidates.length === 0) {
      return [];
    }
    
    // Calculate similarity scores
    const similarities = candidates.map(candidate => {
      const similarity = calculateSimilarity(targetPlayer, candidate);
      return {
        ...candidate,
        similarity_score: similarity.toFixed(3),
        similarity_percentage: (similarity * 100).toFixed(1) + '%'
      };
    });
    
    // Sort by similarity and return top N
    similarities.sort((a, b) => parseFloat(b.similarity_score) - parseFloat(a.similarity_score));
    
    return similarities.slice(0, limit);
  } catch (error) {
    console.error('Error finding historical precedents:', error);
    throw new Error(`Failed to find similar players: ${error.message}`);
  }
}

/**
 * Calculate similarity between two players using weighted cosine similarity
 * 
 * @param {Object} player1 - First player
 * @param {Object} player2 - Second player
 * @returns {number} Similarity score (0-1)
 */
function calculateSimilarity(player1, player2) {
  // Define features and their weights for similarity calculation
  const features = [
    { key: 'sofascore_rating', weight: 0.25 },
    { key: 'goals', weight: 0.15 },
    { key: 'assists', weight: 0.15 },
    { key: 'xg', weight: 0.10 },
    { key: 'xag', weight: 0.10 },
    { key: 'progressive_passes', weight: 0.15 },
    { key: 'age', weight: 0.10 }
  ];
  
  // Normalize and calculate weighted cosine similarity
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  features.forEach(({ key, weight }) => {
    const val1 = parseFloat(player1[key]) || 0;
    const val2 = parseFloat(player2[key]) || 0;
    
    // Apply weight
    const weighted1 = val1 * weight;
    const weighted2 = val2 * weight;
    
    dotProduct += weighted1 * weighted2;
    magnitude1 += weighted1 * weighted1;
    magnitude2 += weighted2 * weighted2;
  });
  
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
}

/**
 * Project market value over next 5 years based on age curve and performance
 * 
 * @param {Object} player - Player object
 * @param {Object} ageCurve - Age curve analysis
 * @returns {Array} Array of {year, age, projectedValue, projectedRating}
 */
export function projectMarketValue(player, ageCurve) {
  const projections = [];
  const currentAge = player.age;
  const currentRating = parseFloat(player.sofascore_rating) || 6.5;
  
  // Base market value estimation (simplified model)
  // In reality, this would come from market data
  const baseValue = estimateBaseValue(player, currentRating);
  
  for (let i = 0; i <= 5; i++) {
    const projectedAge = currentAge + i;
    const projectedRating = projectRatingAtAge(player, projectedAge, ageCurve);
    const projectedValue = baseValue * (projectedRating / currentRating);
    
    projections.push({
      year: new Date().getFullYear() + i,
      age: projectedAge,
      projectedRating: parseFloat(projectedRating.toFixed(2)),
      projectedValue: Math.round(projectedValue * 10) / 10 // Round to 1 decimal
    });
  }
  
  return projections;
}

/**
 * Estimate base market value from player stats
 * Simplified model - in production this would use real market data
 * 
 * @param {Object} player - Player object
 * @param {number} rating - Current rating
 * @returns {number} Estimated market value in millions
 */
function estimateBaseValue(player, rating) {
  // Base value from rating (0-10 scale to 0-100M)
  let baseValue = Math.pow(rating / 10, 3) * 100;
  
  // Age factor (younger = more valuable)
  const ageFactor = player.age < 24 ? 1.5 : player.age < 28 ? 1.2 : player.age < 31 ? 0.9 : 0.6;
  baseValue *= ageFactor;
  
  // Position factor (forwards tend to be more expensive)
  const positionFactors = {
    'Forward': 1.3,
    'Midfielder': 1.1,
    'Defender': 0.9,
    'Goalkeeper': 0.7
  };
  baseValue *= positionFactors[player.position] || 1.0;
  
  // Output factor (goals + assists boost value)
  const outputBonus = ((player.goals || 0) + (player.assists || 0)) * 0.5;
  baseValue += outputBonus;
  
  return Math.max(1, Math.min(150, baseValue)); // Cap between 1M and 150M
}

/**
 * Project rating at a specific age based on age curve
 * 
 * @param {Object} player - Player object
 * @param {number} targetAge - Target age for projection
 * @param {Object} ageCurve - Age curve analysis
 * @returns {number} Projected rating
 */
function projectRatingAtAge(player, targetAge, ageCurve) {
  const curve = AGE_CURVES[player.position] || AGE_CURVES['Midfielder'];
  const currentAge = player.age;
  const currentRating = parseFloat(player.sofascore_rating) || 6.5;
  const peakRating = parseFloat(ageCurve.projectedPeakRating);
  
  // If target age is current age, return current rating
  if (targetAge === currentAge) {
    return currentRating;
  }
  
  // If target age is in development phase
  if (targetAge < curve.peakAge) {
    const progressToPeak = (targetAge - currentAge) / (curve.peakAge - currentAge);
    return currentRating + (peakRating - currentRating) * progressToPeak;
  }
  
  // If target age is at peak
  if (targetAge === curve.peakAge) {
    return peakRating;
  }
  
  // If target age is past peak (decline phase)
  const yearsAfterPeak = targetAge - curve.peakAge;
  const declineRate = 0.03; // 3% decline per year after peak
  const declinedRating = peakRating * Math.pow(1 - declineRate, yearsAfterPeak);
  
  return Math.max(5.0, declinedRating); // Floor at 5.0 rating
}

/**
 * Generate career path prediction using GPT with RAG
 * 
 * @param {Object} pool - PostgreSQL connection pool
 * @param {string} playerId - Player ID
 * @returns {Promise<Object>} Career prediction with narrative and projections
 */
export async function generateCareerPrediction(pool, playerId) {
  try {
    // Fetch player data
    const playerQuery = `
      SELECT 
        p.*,
        t.team_name,
        t.logo_url
      FROM players p
      INNER JOIN team t ON p.team_id = t.team_id
      WHERE p.id = $1
    `;
    
    const playerResult = await pool.query(playerQuery, [playerId]);
    
    if (playerResult.rows.length === 0) {
      throw new Error('Player not found');
    }
    
    const player = playerResult.rows[0];
    
    // Calculate age curve
    const ageCurve = calculateAgeCurve(player);
    
    // Find historical precedents
    const similarPlayers = await findHistoricalPrecedents(pool, player, 3);
    
    // Project market value
    const marketProjections = projectMarketValue(player, ageCurve);
    
    // Build LLM prompt with RAG context
    const systemPrompt = `You are an elite football scout and data analyst. Analyze player career trajectories using statistical data and historical precedents. Provide:
- Career phase assessment (development/peak/decline)
- Peak year prediction with confidence level
- Development areas for improvement
- Market value trajectory analysis
- Risk factors and injury considerations
- Squad fit recommendations

Be specific, data-driven, and use football terminology.`;
    
    const userPrompt = `
Analyze the career trajectory for:

**Player Profile:**
- Name: ${player.player_name}
- Age: ${player.age}
- Position: ${player.position}
- Club: ${player.team_name}
- Nationality: ${player.nationality}

**Current Stats (2023/24 Season):**
- SofaScore Rating: ${player.sofascore_rating || 'N/A'}
- Goals: ${player.goals || 0}
- Assists: ${player.assists || 0}
- xG: ${player.xg || 'N/A'}
- xAG: ${player.xag || 'N/A'}
- Progressive Passes: ${player.progressive_passes || 'N/A'}
- Appearances: ${player.appearances || 0}
- Minutes: ${player.minutes_played || 0}

**Age-Curve Analysis:**
${ageCurve.description}
- Current Phase: ${ageCurve.currentPhase}
- Peak Age: ${ageCurve.peakAge} years old
- Years Until Peak: ${ageCurve.yearsUntilPeak}
- Projected Peak Rating: ${ageCurve.projectedPeakRating}
- Potential Increase: ${ageCurve.potentialIncrease}

**Historical Precedents (Similar Players):**
${similarPlayers.map((sp, idx) => `
${idx + 1}. ${sp.player_name} (${sp.team_name})
   - Age: ${sp.age} | Rating: ${sp.sofascore_rating}
   - Similarity: ${sp.similarity_percentage}
   - Stats: ${sp.goals || 0}G, ${sp.assists || 0}A, ${sp.progressive_passes || 0} Prog.Passes
`).join('\n')}

**Market Value Projection (Next 5 Years):**
${marketProjections.map(p => `Year ${p.year} (Age ${p.age}): €${p.projectedValue}M (Rating: ${p.projectedRating})`).join('\n')}

Generate a comprehensive career path prediction covering:
1. Current Phase Assessment (2-3 sentences)
2. Peak Year Prediction (when will they reach peak performance?)
3. Development Trajectory (what to expect over next 3-5 years)
4. Market Value Analysis (investment perspective)
5. Risk Factors (injury history, position-specific concerns)
6. Squad Fit Recommendation (what type of club should sign them?)

Keep it concise but insightful - total 300-400 words.
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
    
    const analysis = response.choices[0]?.message?.content || 'Unable to generate analysis.';
    
    return {
      player: {
        id: player.id,
        name: player.player_name,
        age: player.age,
        position: player.position,
        team: player.team_name,
        nationality: player.nationality,
        logo_url: player.logo_url
      },
      ageCurve,
      similarPlayers,
      marketProjections,
      analysis
    };
  } catch (error) {
    console.error('Error generating career prediction:', error);
    throw new Error(`Failed to generate career prediction: ${error.message}`);
  }
}

/**
 * Compare two players for long-term signing decision
 * 
 * @param {Object} pool - PostgreSQL connection pool
 * @param {string} playerId1 - First player ID
 * @param {string} playerId2 - Second player ID
 * @param {string} clubContext - Optional club context (e.g., "Arsenal needs a creative midfielder")
 * @returns {Promise<Object>} Comparison analysis with recommendation
 */
export async function comparePlayersForSigning(pool, playerId1, playerId2, clubContext = '') {
  try {
    // Generate predictions for both players
    const [prediction1, prediction2] = await Promise.all([
      generateCareerPrediction(pool, playerId1),
      generateCareerPrediction(pool, playerId2)
    ]);
    
    // Build comparison prompt
    const systemPrompt = `You are a technical director making long-term signing decisions. Compare two players objectively using data and provide a clear recommendation. Consider:
- Current ability vs. future potential
- Age curve and peak years
- Market value trajectory (ROI)
- Injury risk and consistency
- Squad fit and tactical flexibility
- Resale value potential

Provide a "Software Engineering Recommendation" - a clear, justified decision like you would in a technical design review.`;
    
    const userPrompt = `
Compare these two players for a long-term signing:

**PLAYER A: ${prediction1.player.name}**
- Age: ${prediction1.player.age} | Position: ${prediction1.player.position}
- Current Phase: ${prediction1.ageCurve.currentPhase}
- Peak Age: ${prediction1.ageCurve.peakAge} (${prediction1.ageCurve.yearsUntilPeak} years until peak)
- Projected Peak Rating: ${prediction1.ageCurve.projectedPeakRating}
- Current Market Value: €${prediction1.marketProjections[0].projectedValue}M
- Peak Market Value: €${Math.max(...prediction1.marketProjections.map(p => p.projectedValue))}M
- Similar to: ${prediction1.similarPlayers.map(p => p.player_name).join(', ')}

**PLAYER B: ${prediction2.player.name}**
- Age: ${prediction2.player.age} | Position: ${prediction2.player.position}
- Current Phase: ${prediction2.ageCurve.currentPhase}
- Peak Age: ${prediction2.ageCurve.peakAge} (${prediction2.ageCurve.yearsUntilPeak} years until peak)
- Projected Peak Rating: ${prediction2.ageCurve.projectedPeakRating}
- Current Market Value: €${prediction2.marketProjections[0].projectedValue}M
- Peak Market Value: €${Math.max(...prediction2.marketProjections.map(p => p.projectedValue))}M
- Similar to: ${prediction2.similarPlayers.map(p => p.player_name).join(', ')}

${clubContext ? `\n**Club Context:**\n${clubContext}\n` : ''}

Provide:
1. **Side-by-Side Comparison** (3-4 key differences)
2. **Long-Term Value Analysis** (5-year perspective)
3. **Risk Assessment** (what could go wrong with each?)
4. **RECOMMENDATION** (Choose one with clear justification - format as: "RECOMMENDATION: Sign [Player Name]")

Total: 250-350 words.
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
    
    const comparison = response.choices[0]?.message?.content || 'Unable to generate comparison.';
    
    return {
      player1: prediction1,
      player2: prediction2,
      comparison,
      clubContext
    };
  } catch (error) {
    console.error('Error comparing players:', error);
    throw new Error(`Failed to compare players: ${error.message}`);
  }
}

export default {
  calculateAgeCurve,
  findHistoricalPrecedents,
  projectMarketValue,
  generateCareerPrediction,
  comparePlayersForSigning
};
