/**
 * Tactical Risk Blueprint - Squad Analysis Utilities
 * Robust risk assessment with data sanitization and fallbacks
 */

/**
 * Generate sanitized squad data for a club with fallbacks
 * Enhanced with real stats: goals, assists, sofascore_rating
 * @param {string} clubName - Name of the club
 * @param {Array} allPlayers - All players from API
 * @returns {Array} - Sanitized squad data with fallbacks
 */
export const generateSquadData = (clubName, allPlayers) => {
  if (!clubName) return [];

  // Filter players for this club
  let clubPlayers = allPlayers.filter(p => 
    p.team_name === clubName || p.club === clubName
  );

  // Fallback: If no players found, create mock key assets
  if (clubPlayers.length === 0) {
    return createMockSquad(clubName);
  }

  // Sanitize player data - ensure all required fields exist
  clubPlayers = clubPlayers.map(player => {
    const sofascoreRating = parseFloat(player.sofascore_rating || player.average_rating) || 6.0;
    const goals = player.goals || player.total_goals || 0;
    const assists = player.assists || player.total_assists || 0;
    const minutes = player.minutes_played || 0;

    // Calculate per-90 stats for display
    const goalsPer90 = calculatePer90(goals, minutes);
    const assistsPer90 = calculatePer90(assists, minutes);

    const sanitized = {
      player_id: player.player_id || `mock-${Math.random()}`,
      player_name: player.player_name || 'Unknown Player',
      position: normalizePosition(player.position),
      team_name: clubName,
      minutes_played: minutes,
      average_rating: sofascoreRating,
      sofascore_rating: sofascoreRating,
      total_goals: goals,
      total_assists: assists,
      goals: goals,
      assists: assists,
      market_value: player.market_value || 5000000,
      // Per-90 stats for analysis
      goals_per_90: goalsPer90,
      assists_per_90: assistsPer90,
      contributions_per_90: goalsPer90 + assistsPer90,
      // Calculate risk score based on available data
      riskScore: 0, // Will be calculated below
      // Dynamic risk modifiers
      isHighPerformer: sofascoreRating > 7.5,
      relianceWeight: sofascoreRating > 7.5 ? 1.2 : 1.0 // 20% boost for high performers
    };

    // Calculate risk score with all data
    sanitized.riskScore = calculateAssetScore(sanitized);

    return sanitized;
  });

  // Calculate team totals for dependency analysis
  const teamTotalGoals = clubPlayers.reduce((sum, p) => sum + (p.total_goals || 0), 0);
  const teamTotalAssists = clubPlayers.reduce((sum, p) => sum + (p.total_assists || 0), 0);
  const teamTotalContributions = teamTotalGoals + teamTotalAssists;

  // Flag systemic dependencies (>30% of team contributions)
  clubPlayers.forEach(player => {
    const playerContributions = (player.total_goals || 0) + (player.total_assists || 0);
    const contributionPercentage = teamTotalContributions > 0 
      ? (playerContributions / teamTotalContributions) * 100 
      : 0;
    
    player.isSystemicDependency = contributionPercentage > 30;
    player.contributionPercentage = contributionPercentage;
  });

  return clubPlayers;
};

/**
 * Create mock squad when no real data exists
 * @param {string} clubName - Name of the club
 * @returns {Array} - Mock squad data
 */
const createMockSquad = (clubName) => {
  const positions = [
    { pos: 'Goalkeeper', abbr: 'GK', count: 1 },
    { pos: 'Defender', abbr: 'DEF', count: 4 },
    { pos: 'Midfielder', abbr: 'MID', count: 4 },
    { pos: 'Forward', abbr: 'FWD', count: 2 }
  ];

  const mockPlayers = [];
  let id = 1;

  positions.forEach(({ pos, abbr, count }) => {
    for (let i = 1; i <= count; i++) {
      mockPlayers.push({
        player_id: `mock-${clubName}-${abbr}-${i}`,
        player_name: `${clubName} ${pos} ${i}`,
        position: pos,
        team_name: clubName,
        minutes_played: 1500,
        average_rating: 6.5 + (Math.random() * 1.5),
        total_goals: pos === 'Forward' ? Math.floor(Math.random() * 15) : Math.floor(Math.random() * 5),
        total_assists: Math.floor(Math.random() * 10),
        market_value: 10000000 + (Math.random() * 40000000),
        riskScore: 50 + (Math.random() * 40),
        isMock: true
      });
      id++;
    }
  });

  return mockPlayers;
};

/**
 * Normalize position to standard categories
 * @param {string} position - Raw position string
 * @returns {string} - Normalized position
 */
const normalizePosition = (position) => {
  if (!position) return 'Midfielder';
  
  const pos = position.toLowerCase();
  
  if (pos.includes('goal')) return 'Goalkeeper';
  if (pos.includes('def') || pos.includes('back')) return 'Defender';
  if (pos.includes('mid')) return 'Midfielder';
  if (pos.includes('for') || pos.includes('att') || pos.includes('wing') || pos.includes('striker')) return 'Forward';
  
  return 'Midfielder'; // Default
};

/**
 * Calculate per-90 stats
 * @param {number} value - Raw stat value
 * @param {number} minutes - Minutes played
 * @returns {number} - Per-90 stat
 */
const calculatePer90 = (value, minutes) => {
  if (!value || !minutes || minutes === 0) return 0;
  return (Number(value) / Number(minutes)) * 90;
};

/**
 * Calculate Asset Score for a player
 * Enhanced with real stats: goals, assists, sofascore_rating
 * @param {Object} player - Player data
 * @returns {number} - Asset score (0-100)
 */
const calculateAssetScore = (player) => {
  const marketValue = player.market_value || 5000000;
  const rating = parseFloat(player.sofascore_rating || player.average_rating) || 6.0;
  const goals = player.goals || player.total_goals || 0;
  const assists = player.assists || player.total_assists || 0;
  const minutes = player.minutes_played || 0;

  // Calculate per-90 contributions
  const goalsPer90 = calculatePer90(goals, minutes);
  const assistsPer90 = calculatePer90(assists, minutes);
  const contributionsPer90 = goalsPer90 + assistsPer90;

  // Normalize market value (assuming max 100M)
  const valueScore = Math.min((marketValue / 100000000) * 30, 30);
  
  // SofaScore rating (max 10 = 35 points)
  const ratingScore = Math.min((rating / 10) * 35, 35);
  
  // G+A contribution per 90 (capped at 25 points)
  const outputScore = Math.min(contributionsPer90 * 10, 25);
  
  // Minutes played reliability (max 3420 minutes = 10 points)
  const minutesScore = Math.min((minutes / 3420) * 10, 10);

  return Math.min(valueScore + ratingScore + outputScore + minutesScore, 100);
};

/**
 * Calculate a player's Reliance Score
 * Formula: (Minutes Played / Total Team Minutes) * (Player Performance Percentile)
 * 
 * @param {Object} player - Player data including minutes and stats
 * @param {number} totalTeamMinutes - Total minutes played by the team
 * @param {Array} allTeamPlayers - All players in the team for percentile calculation
 * @returns {number} - Reliance score (0-100)
 */
export const calculateRelianceScore = (player, totalTeamMinutes, allTeamPlayers) => {
  if (!player || !totalTeamMinutes || totalTeamMinutes === 0) {
    return player?.riskScore || 0;
  }

  // Minutes played ratio (0-1)
  const minutesRatio = Math.min(player.minutes_played / totalTeamMinutes, 1);

  // Calculate performance percentile based on rating
  const performancePercentile = calculatePerformancePercentile(player, allTeamPlayers);

  // Reliance Score: combines playing time with performance quality
  const relianceScore = minutesRatio * performancePercentile * 100;

  return Math.min(Math.round(relianceScore * 100) / 100, 100);
};

/**
 * Calculate performance percentile for a player
 * Based on average rating, goals, assists, and minutes played
 * 
 * @param {Object} player - Player data
 * @param {Array} allPlayers - All players to compare against
 * @returns {number} - Percentile (0-1)
 */
export const calculatePerformancePercentile = (player, allPlayers) => {
  if (!player || !allPlayers || allPlayers.length === 0) {
    return 0.5; // Default to median
  }

  // Create a composite performance score
  const getCompositeScore = (p) => {
    const rating = parseFloat(p.average_rating) || 0;
    const goalsPerGame = p.minutes_played > 0 ? (p.total_goals / (p.minutes_played / 90)) : 0;
    const assistsPerGame = p.minutes_played > 0 ? (p.total_assists / (p.minutes_played / 90)) : 0;
    
    // Weighted composite: rating is primary, goals/assists add bonus
    return rating + (goalsPerGame * 0.5) + (assistsPerGame * 0.3);
  };

  const playerScore = getCompositeScore(player);
  
  // Count how many players this player outperforms
  let betterThanCount = 0;
  allPlayers.forEach(otherPlayer => {
    if (getCompositeScore(otherPlayer) < playerScore) {
      betterThanCount++;
    }
  });

  return betterThanCount / allPlayers.length;
};

/**
 * Calculate Drop-off Delta (Bench Gap)
 * The statistical difference between a star player and their primary substitute
 * 
 * @param {Object} starPlayer - The critical asset player
 * @param {Object} substitutePlayer - The backup player in same position
 * @returns {Object} - Drop-off metrics
 */
export const calculateDropOffDelta = (starPlayer, substitutePlayer) => {
  if (!starPlayer) {
    return {
      ratingDelta: 0,
      goalsDelta: 0,
      assistsDelta: 0,
      overallDelta: 0,
      severity: 'low'
    };
  }

  // If no substitute, assume significant drop-off
  if (!substitutePlayer) {
    return {
      ratingDelta: 2.0,
      goalsDelta: 100,
      assistsDelta: 100,
      overallDelta: 80,
      severity: 'critical'
    };
  }

  const starRating = parseFloat(starPlayer.average_rating) || 0;
  const subRating = parseFloat(substitutePlayer.average_rating) || 0;
  const ratingDelta = Math.max(0, starRating - subRating);

  // Calculate per-game metrics
  const starGoalsPerGame = starPlayer.minutes_played > 0 
    ? (starPlayer.total_goals / (starPlayer.minutes_played / 90)) 
    : 0;
  const subGoalsPerGame = substitutePlayer.minutes_played > 0 
    ? (substitutePlayer.total_goals / (substitutePlayer.minutes_played / 90)) 
    : 0;
  const goalsDelta = starGoalsPerGame > 0 
    ? ((starGoalsPerGame - subGoalsPerGame) / starGoalsPerGame * 100) 
    : 0;

  const starAssistsPerGame = starPlayer.minutes_played > 0 
    ? (starPlayer.total_assists / (starPlayer.minutes_played / 90)) 
    : 0;
  const subAssistsPerGame = substitutePlayer.minutes_played > 0 
    ? (substitutePlayer.total_assists / (substitutePlayer.minutes_played / 90)) 
    : 0;
  const assistsDelta = starAssistsPerGame > 0 
    ? ((starAssistsPerGame - subAssistsPerGame) / starAssistsPerGame * 100) 
    : 0;

  // Overall delta: weighted average
  const overallDelta = (ratingDelta * 10) + (goalsDelta * 0.3) + (assistsDelta * 0.2);

  // Determine severity
  let severity = 'low';
  if (overallDelta > 50) severity = 'critical';
  else if (overallDelta > 30) severity = 'high';
  else if (overallDelta > 15) severity = 'medium';

  return {
    ratingDelta: Math.round(ratingDelta * 100) / 100,
    goalsDelta: Math.round(goalsDelta * 100) / 100,
    assistsDelta: Math.round(assistsDelta * 100) / 100,
    overallDelta: Math.round(overallDelta * 100) / 100,
    severity
  };
};

/**
 * Calculate Fragility Index for a player
 * Combines Reliance Score with Drop-off Delta
 * High reliance + High drop-off = High fragility
 * 
 * @param {number} relianceScore - How much team relies on player (0-100)
 * @param {Object} dropOffDelta - The bench gap metrics
 * @returns {Object} - Fragility metrics
 */
export const calculateFragilityIndex = (relianceScore, dropOffDelta) => {
  // Fragility = Reliance * Drop-off severity
  // Normalized to 0-100 scale
  const fragilityScore = (relianceScore / 100) * dropOffDelta.overallDelta;

  // Determine risk level
  let riskLevel = 'low';
  let color = '#00FF85'; // Green
  if (fragilityScore > 60) {
    riskLevel = 'critical';
    color = '#FF0000'; // Red
  } else if (fragilityScore > 40) {
    riskLevel = 'high';
    color = '#FF6B00'; // Orange
  } else if (fragilityScore > 20) {
    riskLevel = 'medium';
    color = '#FFD700'; // Yellow
  }

  return {
    fragilityScore: Math.round(fragilityScore * 100) / 100,
    riskLevel,
    color
  };
};

/**
 * Calculate Replacement Cost
 * Formula: Market Value * 1.4 (premium for immediate replacement)
 * 
 * @param {number} marketValue - Player's current market value
 * @param {number} multiplier - Replacement premium (default 1.4)
 * @returns {number} - Estimated replacement cost
 */
export const calculateReplacementCost = (marketValue, multiplier = 1.4) => {
  if (!marketValue || marketValue <= 0) {
    return 0;
  }
  return Math.round(marketValue * multiplier * 100) / 100;
};

/**
 * Simulate injury impact on team performance
 * Estimates drop in league position or win probability
 * 
 * @param {Object} player - The injured player
 * @param {Object} teamStats - Current team statistics
 * @param {Object} dropOffDelta - The bench gap
 * @returns {Object} - Impact simulation results
 */
export const simulateInjuryImpact = (player, teamStats, dropOffDelta) => {
  if (!player || !teamStats || !dropOffDelta) {
    return {
      positionDrop: 0,
      pointsLost: 0,
      winProbabilityDrop: 0
    };
  }

  // Base impact on drop-off severity and player's reliance
  const severityMultiplier = {
    low: 0.5,
    medium: 1.0,
    high: 1.5,
    critical: 2.5
  };

  const multiplier = severityMultiplier[dropOffDelta.severity] || 1.0;

  // Estimate league position drop (1-5 positions)
  const positionDrop = Math.min(Math.round(dropOffDelta.overallDelta / 15 * multiplier), 5);

  // Estimate points lost over a season (based on rating drop)
  const pointsLost = Math.round(dropOffDelta.ratingDelta * 3 * multiplier);

  // Estimate win probability drop (percentage points)
  const winProbabilityDrop = Math.min(Math.round(dropOffDelta.overallDelta / 2 * multiplier), 40);

  return {
    positionDrop,
    pointsLost,
    winProbabilityDrop: Math.round(winProbabilityDrop * 100) / 100
  };
};

/**
 * Find the primary substitute for a player
 * Based on same position and highest rating among bench players
 * 
 * @param {Object} starPlayer - The critical asset
 * @param {Array} allTeamPlayers - All squad players
 * @returns {Object|null} - The substitute player or null
 */
export const findPrimarySubstitute = (starPlayer, allTeamPlayers) => {
  if (!starPlayer || !allTeamPlayers || allTeamPlayers.length === 0) {
    return null;
  }

  // Filter players in same position, excluding the star player
  const samePositionPlayers = allTeamPlayers.filter(p => 
    p.position === starPlayer.position && 
    p.player_id !== starPlayer.player_id &&
    p.minutes_played < starPlayer.minutes_played // Likely a backup
  );

  if (samePositionPlayers.length === 0) {
    return null;
  }

  // Sort by rating and return the best substitute
  const sortedSubstitutes = samePositionPlayers.sort((a, b) => {
    const ratingA = parseFloat(a.average_rating) || 0;
    const ratingB = parseFloat(b.average_rating) || 0;
    return ratingB - ratingA;
  });

  return sortedSubstitutes[0];
};

/**
 * Analyze full squad fragility
 * Returns risk assessment for all key players
 * 
 * @param {Array} teamPlayers - All players in the squad
 * @param {number} minMinutes - Minimum minutes to be considered (default 450)
 * @returns {Array} - Array of player risk analyses
 */
export const analyzeSquadFragility = (teamPlayers, minMinutes = 450) => {
  if (!teamPlayers || teamPlayers.length === 0) {
    return [];
  }

  // Filter to only key players (played significant minutes)
  const keyPlayers = teamPlayers.filter(p => p.minutes_played >= minMinutes);

  // Calculate total team minutes
  const totalTeamMinutes = teamPlayers.reduce((sum, p) => sum + (p.minutes_played || 0), 0);

  // Analyze each key player
  const riskAnalyses = keyPlayers.map(player => {
    const relianceScore = calculateRelianceScore(player, totalTeamMinutes, teamPlayers);
    const substitute = findPrimarySubstitute(player, teamPlayers);
    const dropOffDelta = calculateDropOffDelta(player, substitute);
    const fragility = calculateFragilityIndex(relianceScore, dropOffDelta);
    const replacementCost = calculateReplacementCost(player.market_value);

    return {
      player,
      substitute,
      relianceScore,
      dropOffDelta,
      fragility,
      replacementCost,
      minutesPlayed: player.minutes_played,
      position: player.position
    };
  });

  // Sort by fragility score (most fragile first)
  return riskAnalyses.sort((a, b) => b.fragility.fragilityScore - a.fragility.fragilityScore);
};

/**
 * Calculate Squad Strength Drop when a player is absent
 * @param {Object} player - The absent player
 * @param {Array} allPlayers - All squad players
 * @returns {number} - Percentage drop (0-100)
 */
export const calculateSquadStrengthDrop = (player, allPlayers) => {
  if (!player || !allPlayers || allPlayers.length === 0) return 0;

  const totalRating = allPlayers.reduce((sum, p) => sum + (parseFloat(p.average_rating) || 6.0), 0);
  const playerRating = parseFloat(player.average_rating) || 6.0;
  
  const dropPercentage = (playerRating / totalRating) * 100;
  
  return Math.min(Math.round(dropPercentage * 100) / 100, 100);
};

/**
 * Calculate Squad Integrity (0-100%)
 * @param {Array} allPlayers - All squad players
 * @param {Set} absentPlayerIds - Set of absent player IDs
 * @returns {number} - Integrity percentage (0-100)
 */
export const calculateSquadIntegrity = (allPlayers, absentPlayerIds) => {
  if (!allPlayers || allPlayers.length === 0) return 100;
  if (!absentPlayerIds || absentPlayerIds.size === 0) return 100;

  let totalDrop = 0;
  absentPlayerIds.forEach(playerId => {
    const player = allPlayers.find(p => p.player_id === playerId);
    if (player) {
      totalDrop += calculateSquadStrengthDrop(player, allPlayers);
    }
  });

  return Math.max(0, Math.min(100, 100 - totalDrop));
};

/**
 * Assess bench depth for a position
 * @param {string} position - Position to check
 * @param {Array} allPlayers - All squad players
 * @returns {string} - Depth level: 'High', 'Medium', 'Low'
 */
export const assessBenchDepth = (position, allPlayers) => {
  if (!position || !allPlayers) return 'Low';

  const positionPlayers = allPlayers.filter(p => p.position === position);
  const count = positionPlayers.length;

  if (count >= 5) return 'High';
  if (count >= 3) return 'Medium';
  return 'Low';
};

/**
 * Determine role criticality
 * @param {Object} player - Player to analyze
 * @param {Array} allPlayers - All squad players
 * @returns {string} - Role description
 */
export const determineRoleCriticality = (player, allPlayers) => {
  if (!player) return 'Squad Player';

  const riskScore = player.riskScore || 0;
  const goals = player.total_goals || 0;
  const assists = player.total_assists || 0;
  const rating = parseFloat(player.average_rating) || 6.0;

  // Check if player is dominant in their position
  const positionPlayers = allPlayers.filter(p => p.position === player.position);
  const isTopRated = positionPlayers.every(p => 
    parseFloat(p.average_rating || 6.0) <= rating || p.player_id === player.player_id
  );

  if (riskScore > 80) {
    if (goals > 15) return 'Primary Goal Threat';
    if (assists > 10) return 'Creative Catalyst';
    if (isTopRated) return 'Defensive Anchor';
    return 'Key Player';
  }

  if (riskScore > 60) {
    if (goals + assists > 10) return 'Important Contributor';
    return 'Regular Starter';
  }

  if (riskScore > 40) {
    return 'Rotation Option';
  }

  return 'Squad Depth';
};

/**
 * Group players by position
 * @param {Array} players - All players
 * @returns {Object} - Players grouped by position
 */
export const groupPlayersByPosition = (players) => {
  if (!players || players.length === 0) {
    return {
      Goalkeeper: [],
      Defender: [],
      Midfielder: [],
      Forward: []
    };
  }

  return {
    Goalkeeper: players.filter(p => p.position === 'Goalkeeper').sort((a, b) => b.riskScore - a.riskScore),
    Defender: players.filter(p => p.position === 'Defender').sort((a, b) => b.riskScore - a.riskScore),
    Midfielder: players.filter(p => p.position === 'Midfielder').sort((a, b) => b.riskScore - a.riskScore),
    Forward: players.filter(p => p.position === 'Forward').sort((a, b) => b.riskScore - a.riskScore)
  };
};

/**
 * Calculate stat-based drop-off for attackers (xG impact)
 * @param {Object} player - The absent player
 * @param {Array} allPlayers - All squad players
 * @returns {Object} - xG drop analysis
 */
export const calculateAttackerDropOff = (player, allPlayers) => {
  if (!player || !allPlayers) return { xgDrop: 0, percentage: 0 };

  const attackers = allPlayers.filter(p => 
    p.position === 'Forward' || p.position === 'Midfielder'
  );

  const totalTeamXG = attackers.reduce((sum, p) => {
    const contributionsPer90 = (p.goals_per_90 || 0) + (p.assists_per_90 || 0);
    return sum + contributionsPer90;
  }, 0);

  const playerXGContribution = (player.goals_per_90 || 0) + (player.assists_per_90 || 0);
  const xgDrop = playerXGContribution;
  const percentage = totalTeamXG > 0 ? (xgDrop / totalTeamXG) * 100 : 0;

  return {
    xgDrop: xgDrop.toFixed(2),
    percentage: percentage.toFixed(1),
    teamXGBefore: totalTeamXG.toFixed(2),
    teamXGAfter: (totalTeamXG - xgDrop).toFixed(2)
  };
};

/**
 * Calculate stat-based drop-off for defenders (xGA impact)
 * @param {Object} player - The absent player
 * @param {Array} allPlayers - All squad players
 * @returns {Object} - xGA increase analysis
 */
export const calculateDefenderDropOff = (player, allPlayers) => {
  if (!player || !allPlayers) return { xgaIncrease: 0, percentage: 0 };

  const defenders = allPlayers.filter(p => 
    p.position === 'Defender' || p.position === 'Goalkeeper'
  );

  // Estimate defensive contribution based on rating
  const avgDefensiveRating = defenders.reduce((sum, p) => 
    sum + (parseFloat(p.sofascore_rating) || 6.0), 0
  ) / (defenders.length || 1);

  const playerRating = parseFloat(player.sofascore_rating) || 6.0;
  const ratingGap = Math.max(0, playerRating - avgDefensiveRating);
  
  // Estimate xGA increase based on rating gap
  const xgaIncrease = ratingGap * 0.15; // 0.15 xGA per rating point
  const percentage = avgDefensiveRating > 0 ? (ratingGap / avgDefensiveRating) * 100 : 0;

  return {
    xgaIncrease: xgaIncrease.toFixed(2),
    percentage: percentage.toFixed(1),
    playerRating: playerRating.toFixed(1),
    avgRating: avgDefensiveRating.toFixed(1)
  };
};

/**
 * Get primary stat for a player based on position
 * @param {Object} player - Player data
 * @returns {Object} - Primary stat display
 */
export const getPrimaryStat = (player) => {
  if (!player) return { label: 'N/A', value: '--' };

  const position = player.position;
  const rating = parseFloat(player.sofascore_rating || player.average_rating) || 0;
  const contributions = (player.total_goals || 0) + (player.total_assists || 0);

  if (position === 'Forward' || position === 'Midfielder') {
    return {
      label: 'G+A',
      value: contributions,
      secondary: `${rating.toFixed(1)} Rating`
    };
  }

  // Defenders and Goalkeepers
  return {
    label: 'Rating',
    value: rating.toFixed(1),
    secondary: `${player.minutes_played || 0}' played`
  };
};

/**
 * Format currency for display
 * @param {number} value - Currency value
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (value) => {
  if (!value || value === 0) return '£0';
  
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}K`;
  }
  return `£${value.toFixed(0)}`;
};
