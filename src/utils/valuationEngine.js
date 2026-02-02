/**
 * Valuation Engine - Fair Market Value Calculator
 * 
 * Calculates a player's theoretical "Fair Market Value" (FMV) based on
 * performance metrics, age, and position to identify market inefficiencies.
 */

/**
 * Position-based value multipliers
 * Reflects market premium for different positions
 */
const POSITION_BASE_VALUES = {
  // Forwards - highest premium
  'Centre-Forward': 1.3,
  'Left Winger': 1.25,
  'Right Winger': 1.25,
  'Second Striker': 1.2,
  'Attacking Midfield': 1.15,
  
  // Midfielders
  'Central Midfield': 1.0,
  'Defensive Midfield': 0.95,
  'Left Midfield': 1.05,
  'Right Midfield': 1.05,
  
  // Defenders
  'Centre-Back': 0.9,
  'Left-Back': 0.95,
  'Right-Back': 0.95,
  
  // Goalkeepers
  'Goalkeeper': 0.75,
  
  // Default
  'default': 1.0
};

/**
 * Age curve coefficients
 * Peak performance: 25-28 years old
 * 
 * @param {number} age - Player's age
 * @returns {number} Age factor (0.5 to 1.2)
 */
export function getAgeFactor(age) {
  if (age < 20) return 0.6 + (age - 17) * 0.05; // Young talent: 0.6-0.75
  if (age < 23) return 0.75 + (age - 20) * 0.08; // Rising stars: 0.75-0.99
  if (age <= 25) return 0.99 + (age - 23) * 0.05; // Approaching peak: 0.99-1.09
  if (age <= 28) return 1.1; // Prime years: 1.1
  if (age <= 30) return 1.1 - (age - 28) * 0.1; // Early decline: 1.1-0.9
  if (age <= 32) return 0.9 - (age - 30) * 0.1; // Decline: 0.9-0.7
  return Math.max(0.5, 0.7 - (age - 32) * 0.05); // Veteran: 0.5-0.7
}

/**
 * Performance rating coefficient
 * Converts SofaScore rating (6.0-8.5) to value multiplier
 * 
 * @param {number} rating - SofaScore rating
 * @returns {number} Rating coefficient
 */
export function getRatingCoefficient(rating) {
  if (!rating || rating < 6.0) return 0.3; // Poor performance
  if (rating < 6.5) return 0.5; // Below average
  if (rating < 7.0) return 0.7; // Average
  if (rating < 7.5) return 1.0; // Good
  if (rating < 8.0) return 1.3; // Very good
  if (rating < 8.5) return 1.6; // Excellent
  return 2.0; // World class (8.5+)
}

/**
 * Goal contribution bonus
 * Awards additional value for goal scorers and assisters
 * 
 * @param {number} goals - Goals scored
 * @param {number} assists - Assists provided
 * @param {string} position - Player position
 * @returns {number} Contribution multiplier
 */
export function getContributionBonus(goals = 0, assists = 0, position = '') {
  const totalContributions = goals + assists;
  const positionStr = position || ''; // Handle null/undefined
  const isAttacker = positionStr.includes('Forward') || positionStr.includes('Winger') || positionStr.includes('Attacking');
  const isMidfielder = positionStr.includes('Midfield');
  
  // Base bonus
  let bonus = 1.0;
  
  if (isAttacker) {
    // Attackers expected to score/assist
    if (totalContributions >= 30) bonus = 1.5; // Elite output
    else if (totalContributions >= 20) bonus = 1.3;
    else if (totalContributions >= 15) bonus = 1.15;
    else if (totalContributions >= 10) bonus = 1.05;
  } else if (isMidfielder) {
    // Midfielders get higher bonus for same output
    if (totalContributions >= 20) bonus = 1.6;
    else if (totalContributions >= 15) bonus = 1.4;
    else if (totalContributions >= 10) bonus = 1.2;
    else if (totalContributions >= 5) bonus = 1.1;
  } else {
    // Defenders/GKs get massive bonus for any contributions
    if (totalContributions >= 10) bonus = 1.7;
    else if (totalContributions >= 5) bonus = 1.4;
    else if (totalContributions >= 3) bonus = 1.2;
    else if (totalContributions >= 1) bonus = 1.1;
  }
  
  return bonus;
}

/**
 * Calculate Fair Market Value (FMV)
 * 
 * Formula: Base Value (€20M) * Position Multiplier * Rating Coefficient * Age Factor * Contribution Bonus
 * 
 * @param {Object} player - Player data
 * @param {number} player.sofascore_rating - SofaScore rating
 * @param {number} player.goals - Goals scored
 * @param {number} player.assists - Assists provided
 * @param {number} player.age - Player age
 * @param {string} player.position - Player position
 * @returns {number} Fair Market Value in EUR
 */
export function calculateFairMarketValue(player) {
  const BASE_VALUE = 20000000; // €20M base
  
  // Safely extract player data with defaults
  const sofascore_rating = player.sofascore_rating ?? 7.0;
  const goals = player.goals ?? 0;
  const assists = player.assists ?? 0;
  const age = player.age ?? 25;
  const position = player.position || 'default'; // Handle null/undefined
  
  // Get all multipliers
  const positionMultiplier = POSITION_BASE_VALUES[position] || POSITION_BASE_VALUES.default;
  const ratingCoefficient = getRatingCoefficient(sofascore_rating);
  const ageFactor = getAgeFactor(age);
  const contributionBonus = getContributionBonus(goals, assists, position);
  
  // Calculate FMV
  const fmv = BASE_VALUE * positionMultiplier * ratingCoefficient * ageFactor * contributionBonus;
  
  return Math.round(fmv);
}

/**
 * Calculate Market Alpha Score
 * 
 * Alpha = (FMV - Actual Market Value) / Actual Market Value * 100
 * Positive alpha = Undervalued
 * Negative alpha = Overvalued
 * 
 * @param {number} fmv - Fair Market Value
 * @param {number} actualValue - Actual market value from database
 * @returns {Object} Alpha analysis
 */
export function calculateAlphaScore(fmv, actualValue) {
  if (!actualValue || actualValue <= 0) {
    return {
      alpha: 0,
      status: 'UNKNOWN',
      confidence: 'LOW',
      recommendation: 'Insufficient market data'
    };
  }
  
  const alphaPct = ((fmv - actualValue) / actualValue) * 100;
  
  // Determine market status
  let status, confidence, recommendation;
  
  if (alphaPct > 50) {
    status = 'SEVERELY UNDERVALUED';
    confidence = 'HIGH';
    recommendation = 'Strong Buy - Hidden Gem';
  } else if (alphaPct > 25) {
    status = 'UNDERVALUED';
    confidence = 'HIGH';
    recommendation = 'Buy - Value Opportunity';
  } else if (alphaPct > 10) {
    status = 'SLIGHTLY UNDERVALUED';
    confidence = 'MEDIUM';
    recommendation = 'Consider - Minor Upside';
  } else if (alphaPct > -10) {
    status = 'FAIRLY VALUED';
    confidence = 'MEDIUM';
    recommendation = 'Hold - Fair Price';
  } else if (alphaPct > -25) {
    status = 'SLIGHTLY OVERVALUED';
    confidence = 'MEDIUM';
    recommendation = 'Caution - Limited Upside';
  } else if (alphaPct > -50) {
    status = 'OVERVALUED';
    confidence = 'HIGH';
    recommendation = 'Avoid - Overpriced Asset';
  } else {
    status = 'SEVERELY OVERVALUED';
    confidence = 'HIGH';
    recommendation = 'Strong Sell - Bubble Risk';
  }
  
  return {
    alpha: alphaPct,
    fmv,
    actualValue,
    status,
    confidence,
    recommendation
  };
}

/**
 * Project ROI over next N years
 * 
 * @param {Object} player - Player data
 * @param {number} years - Number of years to project (default: 3)
 * @returns {Array} Year-by-year projections
 */
export function projectROI(player, years = 3) {
  const currentFMV = calculateFairMarketValue(player);
  const projections = [];
  
  for (let i = 1; i <= years; i++) {
    const futureAge = (player.age || 25) + i;
    const futureAgeFactor = getAgeFactor(futureAge);
    const currentAgeFactor = getAgeFactor(player.age || 25);
    
    // Assume rating degrades/improves with age
    let ratingAdjustment = 1.0;
    if (futureAge < 25) ratingAdjustment = 1.02; // Improving
    else if (futureAge <= 28) ratingAdjustment = 1.0; // Stable
    else if (futureAge <= 30) ratingAdjustment = 0.98; // Slight decline
    else ratingAdjustment = 0.95; // Decline
    
    const projectedFMV = currentFMV * (futureAgeFactor / currentAgeFactor) * Math.pow(ratingAdjustment, i);
    const roi = ((projectedFMV - currentFMV) / currentFMV) * 100;
    
    projections.push({
      year: new Date().getFullYear() + i,
      age: futureAge,
      projectedValue: Math.round(projectedFMV),
      roi: roi.toFixed(1),
      change: projectedFMV > currentFMV ? 'UP' : 'DOWN'
    });
  }
  
  return projections;
}

/**
 * Generate AI prompt for market narrative
 * 
 * @param {Object} player - Player data
 * @param {Object} alphaData - Alpha calculation results
 * @returns {string} Prompt for LLM
 */
export function generateMarketNarrativePrompt(player, alphaData) {
  return `You are a Premier League transfer market analyst. Provide a concise investment narrative (2-3 sentences) explaining why ${player.player_name || 'this player'} is ${alphaData.status.toLowerCase()}.

Player Profile:
- Name: ${player.player_name || 'Unknown'}
- Age: ${player.age || 'Unknown'}
- Position: ${player.position || 'Unknown'}
- SofaScore Rating: ${player.sofascore_rating || 'N/A'}
- Goals: ${player.goals || 0}
- Assists: ${player.assists || 0}
- Current Market Value: €${(alphaData.actualValue / 1000000).toFixed(1)}M
- Fair Market Value: €${(alphaData.fmv / 1000000).toFixed(1)}M
- Alpha Score: ${alphaData.alpha.toFixed(1)}%

Focus on:
1. Performance vs. price discrepancy
2. Age curve implications
3. Position-specific market dynamics
4. Investment timing (buy now vs. wait)

Keep it professional and data-driven. Use Merriweather font style (formal, elegant).`;
}

/**
 * Batch calculate alpha for multiple players
 * Used for market overview scatter plots
 * 
 * @param {Array} players - Array of player objects
 * @returns {Array} Array of players with alpha data
 */
export function batchCalculateAlpha(players) {
  return players
    .filter(p => p.market_value && p.market_value > 0)
    .map(player => {
      const fmv = calculateFairMarketValue(player);
      const alpha = calculateAlphaScore(fmv, player.market_value);
      
      return {
        ...player,
        fmv,
        alpha: alpha.alpha,
        alphaStatus: alpha.status,
        alphaConfidence: alpha.confidence
      };
    })
    .sort((a, b) => b.alpha - a.alpha); // Sort by alpha (highest first)
}

export default {
  calculateFairMarketValue,
  calculateAlphaScore,
  projectROI,
  generateMarketNarrativePrompt,
  batchCalculateAlpha,
  getAgeFactor,
  getRatingCoefficient,
  getContributionBonus
};
