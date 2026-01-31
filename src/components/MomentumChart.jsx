import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

/**
 * Momentum Chart Component
 * Displays match momentum as a dual-sided area chart showing which team dominated each phase
 * 
 * @param {Array} events - Array of match events
 * @param {string} homeTeamId - Home team ID
 * @param {string} homeTeamName - Home team name
 * @param {string} awayTeamId - Away team ID
 * @param {string} awayTeamName - Away team name
 */
const MomentumChart = ({ 
  events = [], 
  homeTeamId = null, 
  homeTeamName = 'Home',
  awayTeamId = null,
  awayTeamName = 'Away'
}) => {
  // Process events to create minute-by-minute momentum data
  const momentumData = useMemo(() => {
    if (!events || events.length === 0) {
      return [];
    }

    // Initialize data structure for 0-90 minutes (plus stoppage time)
    const maxMinute = Math.max(
      ...events.map(e => parseInt(e.minute || 0)),
      90
    );
    const data = [];
    
    // Initialize all minutes with 0 momentum
    for (let i = 0; i <= maxMinute; i++) {
      data.push({
        minute: i,
        homeMomentum: 0,
        awayMomentum: 0,
        cumulative: 0
      });
    }

      // Process events to calculate momentum
      events.forEach(event => {
        const minute = parseInt(event.minute || 0);
        if (isNaN(minute) || minute < 0 || minute > maxMinute) return;

        const eventType = (event.event_type || '').toLowerCase();
        const teamId = event.team_id;
        const teamName = (event.team_name || '').toLowerCase();
        const homeName = (homeTeamName || '').toLowerCase();
        const awayName = (awayTeamName || '').toLowerCase();
        
        // Determine if event is for home or away team
        // Try team_id first, then fall back to team_name matching
        let isHomeTeam = false;
        let isAwayTeam = false;
        
        if (teamId && homeTeamId) {
          isHomeTeam = teamId === homeTeamId || String(teamId) === String(homeTeamId);
        } else if (teamName && homeName) {
          isHomeTeam = teamName === homeName || teamName.includes(homeName) || homeName.includes(teamName);
        }
        
        if (teamId && awayTeamId) {
          isAwayTeam = teamId === awayTeamId || String(teamId) === String(awayTeamId);
        } else if (teamName && awayName) {
          isAwayTeam = teamName === awayName || teamName.includes(awayName) || awayName.includes(teamName);
        }

      // Assign momentum values based on event type
      // Goals and Assists count as attacks
      if (eventType.includes('goal') || eventType.includes('assist')) {
        if (isHomeTeam) {
          data[minute].homeMomentum += 1;
          data[minute].cumulative += 1;
        } else if (isAwayTeam) {
          data[minute].awayMomentum += 1;
          data[minute].cumulative -= 1;
        }
      }
    });

    // Calculate cumulative momentum
    let runningCumulative = 0;
    return data.map((point, index) => {
      runningCumulative += point.cumulative;
      return {
        ...point,
        cumulative: runningCumulative,
        // For dual-sided display: positive = home, negative = away
        homeArea: Math.max(0, runningCumulative),
        awayArea: Math.min(0, runningCumulative)
      };
    });
  }, [events, homeTeamId, awayTeamId, homeTeamName, awayTeamName]);

  if (momentumData.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-white mb-4">
          Match Momentum
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No momentum data available
        </p>
      </div>
    );
  }

  // Find max absolute value for Y-axis scaling
  const maxMomentum = Math.max(
    ...momentumData.map(d => Math.abs(d.cumulative)),
    5 // Minimum scale of 5
  );

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Minute {data.minute}'
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Momentum: {data.cumulative > 0 ? '+' : ''}{data.cumulative.toFixed(1)}
          </p>
          {data.cumulative > 0 && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {homeTeamName} dominating
            </p>
          )}
          {data.cumulative < 0 && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {awayTeamName} dominating
            </p>
          )}
          {data.cumulative === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Balanced
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-white mb-6">
        Match Momentum
      </h3>
      
      <div className="mb-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-700 dark:text-gray-300">{homeTeamName}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-gray-700 dark:text-gray-300">{awayTeamName}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={momentumData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorHome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorAway" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-neutral-600" />
          <XAxis 
            dataKey="minute" 
            stroke="#6b7280"
            className="dark:stroke-neutral-400"
            label={{ value: 'Minute', position: 'insideBottom', offset: -5, style: { fill: '#6b7280' } }}
          />
          <YAxis 
            domain={[-maxMomentum, maxMomentum]}
            stroke="#6b7280"
            className="dark:stroke-neutral-400"
            tickFormatter={(value) => value > 0 ? `+${value}` : `${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="2 2" />
          
          {/* Home team area (positive values) */}
          <Area
            type="monotone"
            dataKey="homeArea"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#colorHome)"
            name={homeTeamName}
          />
          
          {/* Away team area (negative values) */}
          <Area
            type="monotone"
            dataKey="awayArea"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#colorAway)"
            name={awayTeamName}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
        Momentum calculated from goals and assists. Positive values indicate {homeTeamName} dominance, negative values indicate {awayTeamName} dominance.
      </p>
    </div>
  );
};

export default MomentumChart;
