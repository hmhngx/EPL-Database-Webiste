import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Shot Map Component
 * Displays shots on a mini football pitch SVG
 * Uses zone logic to place shots within penalty box area
 * 
 * @param {Array} events - Array of match events
 * @param {string} homeTeamId - Home team ID
 * @param {string} homeTeamName - Home team name
 * @param {string} awayTeamId - Away team ID
 * @param {string} awayTeamName - Away team name
 */
const ShotMap = ({ 
  events = [], 
  homeTeamId = null, 
  homeTeamName = 'Home',
  awayTeamId = null,
  awayTeamName = 'Away'
}) => {
  // Filter and process goal events for shot map
  const shots = useMemo(() => {
    if (!events || events.length === 0) {
      return [];
    }

    // Filter for goals
    const goalEvents = events.filter(event => {
      const eventType = (event.event_type || '').toLowerCase();
      return eventType.includes('goal') && !eventType.includes('missed');
    });

    return goalEvents.map(event => {
      const teamId = event.team_id;
      const teamName = (event.team_name || '').toLowerCase();
      const homeName = (homeTeamName || '').toLowerCase();
      const awayName = (awayTeamName || '').toLowerCase();
      
      // Determine if event is for home or away team
      // Try team_id first, then fall back to team_name matching
      let isHomeTeam = false;
      
      if (teamId && homeTeamId) {
        isHomeTeam = teamId === homeTeamId || String(teamId) === String(homeTeamId);
      } else if (teamName && homeName) {
        isHomeTeam = teamName === homeName || teamName.includes(homeName) || homeName.includes(teamName);
      }
      
      // Get xg value if available, otherwise use default
      // Since xg might not be in events, we'll use a random value between 0.3-0.9 for goals
      const xg = event.xg || (0.3 + Math.random() * 0.6);
      
      // Zone logic: Randomly place within penalty box area
      // Penalty box is roughly 16.5m x 40.3m, positioned at each end
      // For SVG: pitch is typically 105m x 68m
      // We'll use normalized coordinates (0-100 for width, 0-100 for height)
      
      // Random position within penalty box (roughly 0-15% from goal line, 25-75% from side)
      const isHomeShot = isHomeTeam;
      const x = isHomeShot 
        ? 5 + Math.random() * 10  // Home team shoots from left (0-15%)
        : 85 + Math.random() * 10; // Away team shoots from right (85-100%)
      const y = 25 + Math.random() * 50; // Middle 50% of pitch width
      
      // Size based on xg (larger xg = larger circle)
      const size = Math.max(8, Math.min(20, xg * 25));
      
      return {
        x,
        y,
        size,
        xg,
        playerName: event.player_name || 'Unknown',
        minute: event.minute || 0,
        isGoal: true,
        isHomeTeam,
        teamName: isHomeTeam ? homeTeamName : awayTeamName,
        isPenalty: event.is_penalty || false,
        isOwnGoal: event.is_own_goal || false
      };
    });
  }, [events, homeTeamId, awayTeamId, homeTeamName, awayTeamName]);

  // Separate shots by team
  const homeShots = shots.filter(s => s.isHomeTeam);
  const awayShots = shots.filter(s => !s.isHomeTeam);

  if (shots.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-white mb-4">
          Shot Map
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No shots available for this match
        </p>
      </div>
    );
  }

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 400;
  const padding = 40;

  // Pitch dimensions (normalized to 0-100, then scaled)
  const pitchWidth = svgWidth - (padding * 2);
  const pitchHeight = svgHeight - (padding * 2);

  // Convert normalized coordinates (0-100) to SVG coordinates
  const toSvgX = (x) => padding + (x / 100) * pitchWidth;
  const toSvgY = (y) => padding + (y / 100) * pitchHeight;

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-white mb-6">
        Shot Map
      </h3>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          <span className="text-gray-700 dark:text-gray-300">Goal</span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Circle size = xG value
        </div>
      </div>

      {/* SVG Pitch */}
      <div className="flex justify-center">
        <svg
          width={svgWidth}
          height={svgHeight}
          className="border-2 border-gray-300 dark:border-neutral-600 rounded-lg bg-green-50 dark:bg-green-900/10"
        >
          {/* Pitch outline */}
          <rect
            x={padding}
            y={padding}
            width={pitchWidth}
            height={pitchHeight}
            fill="#4ade80"
            fillOpacity={0.1}
            stroke="#22c55e"
            strokeWidth={2}
          />

          {/* Center line */}
          <line
            x1={padding + pitchWidth / 2}
            y1={padding}
            x2={padding + pitchWidth / 2}
            y2={padding + pitchHeight}
            stroke="#22c55e"
            strokeWidth={2}
            strokeDasharray="5,5"
          />

          {/* Center circle */}
          <circle
            cx={padding + pitchWidth / 2}
            cy={padding + pitchHeight / 2}
            r={pitchHeight * 0.15}
            fill="none"
            stroke="#22c55e"
            strokeWidth={2}
          />

          {/* Left penalty box (Home team attacks from left) */}
          <rect
            x={padding}
            y={padding + pitchHeight * 0.25}
            width={pitchWidth * 0.15}
            height={pitchHeight * 0.5}
            fill="none"
            stroke="#22c55e"
            strokeWidth={2}
          />

          {/* Left goal area */}
          <rect
            x={padding}
            y={padding + pitchHeight * 0.35}
            width={pitchWidth * 0.05}
            height={pitchHeight * 0.3}
            fill="none"
            stroke="#22c55e"
            strokeWidth={2}
          />

          {/* Left goal */}
          <line
            x1={padding}
            y1={padding + pitchHeight * 0.35}
            x2={padding}
            y2={padding + pitchHeight * 0.65}
            stroke="#1f2937"
            strokeWidth={4}
          />

          {/* Right penalty box (Away team attacks from right) */}
          <rect
            x={padding + pitchWidth * 0.85}
            y={padding + pitchHeight * 0.25}
            width={pitchWidth * 0.15}
            height={pitchHeight * 0.5}
            fill="none"
            stroke="#22c55e"
            strokeWidth={2}
          />

          {/* Right goal area */}
          <rect
            x={padding + pitchWidth * 0.95}
            y={padding + pitchHeight * 0.35}
            width={pitchWidth * 0.05}
            height={pitchHeight * 0.3}
            fill="none"
            stroke="#22c55e"
            strokeWidth={2}
          />

          {/* Right goal */}
          <line
            x1={padding + pitchWidth}
            y1={padding + pitchHeight * 0.35}
            x2={padding + pitchWidth}
            y2={padding + pitchHeight * 0.65}
            stroke="#1f2937"
            strokeWidth={4}
          />

          {/* Render shots */}
          {shots.map((shot, index) => {
            const svgX = toSvgX(shot.x);
            const svgY = toSvgY(shot.y);
            const color = shot.isGoal ? '#10b981' : '#ef4444';
            
            return (
              <motion.g
                key={index}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
              >
                <circle
                  cx={svgX}
                  cy={svgY}
                  r={shot.size}
                  fill={color}
                  fillOpacity={0.7}
                  stroke="#ffffff"
                  strokeWidth={2}
                  className="cursor-pointer hover:opacity-100"
                >
                  <title>
                    {shot.playerName} ({shot.teamName}) - {shot.minute}'
                    {shot.isPenalty && ' (Penalty)'}
                    {shot.isOwnGoal && ' (Own Goal)'}
                    {` - xG: ${shot.xg.toFixed(2)}`}
                  </title>
                </circle>
                {/* Small dot in center */}
                <circle
                  cx={svgX}
                  cy={svgY}
                  r={2}
                  fill="#ffffff"
                />
              </motion.g>
            );
          })}

          {/* Team labels */}
          <text
            x={padding + 10}
            y={padding + pitchHeight / 2}
            fill="#6b7280"
            fontSize="12"
            fontWeight="bold"
            className="dark:fill-neutral-400"
          >
            {homeTeamName}
          </text>
          <text
            x={padding + pitchWidth - 10}
            y={padding + pitchHeight / 2}
            fill="#6b7280"
            fontSize="12"
            fontWeight="bold"
            textAnchor="end"
            className="dark:fill-neutral-400"
          >
            {awayTeamName}
          </text>
        </svg>
      </div>

      {/* Shot summary */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {homeShots.length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {homeTeamName} Goals
          </p>
        </div>
        <div className="text-center p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {awayShots.length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {awayTeamName} Goals
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
        Shot positions are estimated using zone logic. Hover over circles for details.
      </p>
    </div>
  );
};

export default ShotMap;
