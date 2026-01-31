import React from 'react';
import { motion } from 'framer-motion';
import TeamLogo from './TeamLogo';

/**
 * MatchStatsDashboard Component
 * Displays tactical match statistics with side-by-side comparisons
 * 
 * @param {Object} homeStats - Home team stats from match_stats table
 * @param {Object} awayStats - Away team stats from match_stats table
 * @param {string} homeTeamName - Home team name
 * @param {string} awayTeamName - Away team name
 * @param {string} homeLogoUrl - Home team logo URL
 * @param {string} awayLogoUrl - Away team logo URL
 */
const MatchStatsDashboard = ({ 
  homeStats, 
  awayStats, 
  homeTeamName, 
  awayTeamName,
  homeLogoUrl,
  awayLogoUrl
}) => {
  // If no stats available, show message
  if (!homeStats && !awayStats) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-white mb-4">
          Match Statistics
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-4">
          Match statistics not available
        </p>
      </div>
    );
  }

  // Helper function to calculate percentage for bar charts
  const calculatePercentage = (homeValue, awayValue) => {
    const total = (homeValue || 0) + (awayValue || 0);
    if (total === 0) return { home: 50, away: 50 };
    const homePct = ((homeValue || 0) / total) * 100;
    const awayPct = ((awayValue || 0) / total) * 100;
    return { home: homePct, away: awayPct };
  };

  // Calculate percentages for each stat
  // For possession, values are already percentages, so use them directly
  const homePossession = parseFloat(homeStats?.possession_pct || 0);
  const awayPossession = parseFloat(awayStats?.possession_pct || 0);
  const possession = {
    home: homePossession,
    away: awayPossession
  };
  
  const shots = calculatePercentage(
    homeStats?.total_shots || 0,
    awayStats?.total_shots || 0
  );
  
  const passes = calculatePercentage(
    homeStats?.accurate_passes || 0,
    awayStats?.accurate_passes || 0
  );

  // Calculate shot accuracy
  const homeShotAccuracy = homeStats?.total_shots > 0
    ? ((homeStats.shots_on_target || 0) / homeStats.total_shots * 100).toFixed(1)
    : '0.0';
  
  const awayShotAccuracy = awayStats?.total_shots > 0
    ? ((awayStats.shots_on_target || 0) / awayStats.total_shots * 100).toFixed(1)
    : '0.0';

  // Bar Chart Component
  const StatBar = ({ label, homeValue, awayValue, homePct, awayPct, homeLabel, awayLabel }) => (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{homeLabel || homeValue}</span>
          {homeValue !== undefined && (
            <span className="text-xs text-gray-500 dark:text-gray-400">({homeValue})</span>
          )}
        </div>
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">{label}</span>
        <div className="flex items-center gap-2">
          {awayValue !== undefined && (
            <span className="text-xs text-gray-500 dark:text-gray-400">({awayValue})</span>
          )}
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{awayLabel || awayValue}</span>
        </div>
      </div>
      <div className="flex gap-2 h-8 rounded-lg overflow-hidden">
        <motion.div
          className="bg-blue-600 dark:bg-blue-500 flex items-center justify-end pr-2"
          initial={{ width: 0 }}
          animate={{ width: `${homePct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {homePct > 10 && (
            <span className="text-white text-xs font-semibold">{homePct.toFixed(1)}%</span>
          )}
        </motion.div>
        <motion.div
          className="bg-red-600 dark:bg-red-500 flex items-center justify-start pl-2"
          initial={{ width: 0 }}
          animate={{ width: `${awayPct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {awayPct > 10 && (
            <span className="text-white text-xs font-semibold">{awayPct.toFixed(1)}%</span>
          )}
        </motion.div>
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-white mb-6">
        Match Statistics
      </h3>

      {/* Team Logos and Formations */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="text-center">
          <TeamLogo
            logoUrl={homeLogoUrl}
            teamName={homeTeamName}
            className="w-20 h-20 mx-auto mb-2 rounded-full"
          />
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{homeTeamName}</p>
          {homeStats?.formation && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Formation: <span className="font-mono">{homeStats.formation}</span>
            </p>
          )}
        </div>
        <div className="text-center">
          <TeamLogo
            logoUrl={awayLogoUrl}
            teamName={awayTeamName}
            className="w-20 h-20 mx-auto mb-2 rounded-full"
          />
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{awayTeamName}</p>
          {awayStats?.formation && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Formation: <span className="font-mono">{awayStats.formation}</span>
            </p>
          )}
        </div>
      </div>

      {/* Statistics Bars */}
      <div className="space-y-4">
        {/* Possession */}
        <StatBar
          label="Possession"
          homeLabel={homePossession > 0 ? `${homePossession.toFixed(1)}%` : '0%'}
          awayLabel={awayPossession > 0 ? `${awayPossession.toFixed(1)}%` : '0%'}
          homePct={possession.home}
          awayPct={possession.away}
        />

        {/* Shots */}
        <StatBar
          label="Shots"
          homeValue={homeStats?.total_shots || 0}
          awayValue={awayStats?.total_shots || 0}
          homePct={shots.home}
          awayPct={shots.away}
        />

        {/* Passes */}
        <StatBar
          label="Accurate Passes"
          homeValue={homeStats?.accurate_passes || 0}
          awayValue={awayStats?.accurate_passes || 0}
          homePct={passes.home}
          awayPct={passes.away}
        />
      </div>

      {/* Additional Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-neutral-700">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Corners</p>
          <div className="flex justify-between">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {homeStats?.corners || 0}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {awayStats?.corners || 0}
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fouls</p>
          <div className="flex justify-between">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {homeStats?.fouls_committed || 0}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {awayStats?.fouls_committed || 0}
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Saves</p>
          <div className="flex justify-between">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {homeStats?.saves || 0}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {awayStats?.saves || 0}
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Shots on Target</p>
          <div className="flex justify-between">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {homeStats?.shots_on_target || 0}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {awayStats?.shots_on_target || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Shot Accuracy Efficiency Box */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-red-50 dark:from-blue-900/20 dark:to-red-900/20 rounded-lg border border-gray-200 dark:border-neutral-700">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 text-center">
          Shot Accuracy
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {homeShotAccuracy}%
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {homeStats?.shots_on_target || 0} / {homeStats?.total_shots || 0}
            </p>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">
              {homeTeamName}
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {awayShotAccuracy}%
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {awayStats?.shots_on_target || 0} / {awayStats?.total_shots || 0}
            </p>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">
              {awayTeamName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchStatsDashboard;

