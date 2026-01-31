import React from 'react';
import { motion } from 'framer-motion';
import { FaChartBar, FaTrophy } from 'react-icons/fa';
import TeamLogo from './TeamLogo';

/**
 * H2HComparison Component
 * Displays head-to-head comparison with stats, form guide, and win probability
 * 
 * @param {Object} h2hData - H2H data from API
 * @param {string} homeLogoUrl - Home team logo URL
 * @param {string} awayLogoUrl - Away team logo URL
 */
const H2HComparison = ({ h2hData, homeLogoUrl, awayLogoUrl }) => {
  if (!h2hData) {
    return null;
  }

  const { home, away } = h2hData || {};
  
  // If we don't have basic team info, don't render
  if (!home || !away || !home.team_name || !away.team_name) {
    return null;
  }

  // Comparison Bar Component
  const ComparisonBar = ({ label, homeValue, awayValue, homeLabel, awayLabel, isPercentage = false }) => {
    // For percentage values (like possession), show actual percentages
    // For count values, show relative to max
    let homePct, awayPct;
    if (isPercentage) {
      // For possession, use actual percentage values (scaled to 50% max for visualization)
      homePct = Math.min((homeValue || 0) * 0.5, 50);
      awayPct = Math.min((awayValue || 0) * 0.5, 50);
    } else {
      // For counts, show relative to max value
      const maxValue = Math.max(homeValue || 0, awayValue || 0);
      homePct = maxValue > 0 ? ((homeValue || 0) / maxValue) * 50 : 0;
      awayPct = maxValue > 0 ? ((awayValue || 0) / maxValue) * 50 : 0;
    }

    return (
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 text-center">
          {label}
        </div>
        <div className="relative flex items-center justify-center">
          {/* Home Team Bar (Left) */}
          <div className="flex-1 flex justify-end items-center pr-2">
            <div className="text-right">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-semibold">
                {homeLabel || (isPercentage ? `${(homeValue || 0).toFixed(1)}%` : (homeValue || 0).toFixed(1))}
              </div>
              <div className="w-full max-w-[200px] ml-auto">
                <div className="h-6 bg-gray-200 dark:bg-neutral-700 rounded-r-lg overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${homePct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-primary to-accent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Center Label */}
          <div className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-[80px] text-center">
            {label}
          </div>

          {/* Away Team Bar (Right) */}
          <div className="flex-1 flex justify-start items-center pl-2">
            <div className="text-left">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-semibold">
                {awayLabel || (isPercentage ? `${(awayValue || 0).toFixed(1)}%` : (awayValue || 0).toFixed(1))}
              </div>
              <div className="w-full max-w-[200px] mr-auto">
                <div className="h-6 bg-gray-200 dark:bg-neutral-700 rounded-l-lg overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${awayPct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-l from-primary to-accent ml-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Form Guide Component
  const FormGuide = ({ form }) => {
    const getFormColor = (result) => {
      switch (result) {
        case 'W':
          return 'bg-green-500';
        case 'D':
          return 'bg-yellow-500';
        case 'L':
          return 'bg-red-500';
        default:
          return 'bg-gray-400';
      }
    };

    const formArray = form.split('').reverse(); // Show oldest to newest (left to right)

    return (
      <div className="flex flex-col items-center">
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold">
          Last 5 Games
        </div>
        <div className="flex gap-2">
          {formArray.length > 0 ? (
            formArray.map((result, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1, type: 'spring' }}
                className={`w-8 h-8 rounded-full ${getFormColor(result)} flex items-center justify-center text-white font-bold text-xs shadow-md`}
                title={`${result === 'W' ? 'Win' : result === 'D' ? 'Draw' : 'Loss'}`}
              >
                {result}
              </motion.div>
            ))
          ) : (
            <div className="text-xs text-gray-400">No recent games</div>
          )}
        </div>
      </div>
    );
  };

  // Win Probability Bar
  const WinProbabilityBar = () => {
    const homeProb = home.win_probability || 33;
    const awayProb = away.win_probability || 33;
    const drawProb = h2hData.draw_probability || 34;

    return (
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-neutral-700">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center flex items-center justify-center gap-2">
          <FaTrophy className="text-yellow-500" />
          Projected Outcome
        </div>
        <div className="relative">
          <div className="flex h-10 rounded-lg overflow-hidden shadow-md">
            {/* Home Win Probability */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${homeProb}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-start pl-3"
            >
              {homeProb >= 15 && (
                <span className="text-white font-bold text-sm">
                  {homeProb.toFixed(0)}%
                </span>
              )}
            </motion.div>
            {/* Draw Probability */}
            {drawProb > 5 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${drawProb}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="bg-yellow-500 flex items-center justify-center"
              >
                {drawProb >= 10 && (
                  <span className="text-white font-bold text-xs">
                    {drawProb.toFixed(0)}%
                  </span>
                )}
              </motion.div>
            )}
            {/* Away Win Probability */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${awayProb}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="bg-gradient-to-l from-blue-500 to-blue-600 flex items-center justify-end pr-3"
            >
              {awayProb >= 15 && (
                <span className="text-white font-bold text-sm">
                  {awayProb.toFixed(0)}%
                </span>
              )}
            </motion.div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
            <span>{home.team_name}</span>
            <span>{away.team_name}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <FaChartBar className="text-primary" />
        <h3 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
          Head-to-Head Comparison
        </h3>
      </div>

      {/* Team Headers with Logos */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="flex flex-col items-center">
          <TeamLogo 
            logoUrl={homeLogoUrl} 
            teamName={home.team_name}
            className="w-12 h-12 rounded-full"
          />
          <div className="text-sm font-semibold text-gray-900 dark:text-white mt-2 text-center">
            {home.team_name}
          </div>
        </div>
        <div className="flex items-center justify-center">
          <span className="text-gray-400 font-bold">VS</span>
        </div>
        <div className="flex flex-col items-center">
          <TeamLogo 
            logoUrl={awayLogoUrl} 
            teamName={away.team_name}
            className="w-12 h-12 rounded-full"
          />
          <div className="text-sm font-semibold text-gray-900 dark:text-white mt-2 text-center">
            {away.team_name}
          </div>
        </div>
      </div>

      {/* Form Guide */}
      <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-neutral-700">
        <FormGuide form={home.form} teamName={home.team_name} />
        <div></div>
        <FormGuide form={away.form} teamName={away.team_name} />
      </div>

      {/* Comparison Stats */}
      <div className="space-y-4">
        {/* Average Possession */}
        {home.avg_possession !== null && away.avg_possession !== null && (
          <ComparisonBar
            label="Avg Possession"
            homeValue={home.avg_possession}
            awayValue={away.avg_possession}
            homeLabel={`${home.avg_possession.toFixed(1)}%`}
            awayLabel={`${away.avg_possession.toFixed(1)}%`}
            isPercentage={true}
          />
        )}

        {/* Average Shots per Game */}
        {home.avg_shots !== null && away.avg_shots !== null && (
          <ComparisonBar
            label="Shots per Game"
            homeValue={home.avg_shots}
            awayValue={away.avg_shots}
            homeLabel={home.avg_shots.toFixed(1)}
            awayLabel={away.avg_shots.toFixed(1)}
          />
        )}

        {/* Average Accurate Passes */}
        {home.avg_passes !== null && away.avg_passes !== null && (
          <ComparisonBar
            label="Avg Accurate Passes"
            homeValue={home.avg_passes}
            awayValue={away.avg_passes}
            homeLabel={home.avg_passes.toFixed(0)}
            awayLabel={away.avg_passes.toFixed(0)}
          />
        )}
        
        {/* Show message if no stats available */}
        {(!home.avg_possession || !away.avg_possession) && 
         (!home.avg_shots || !away.avg_shots) && 
         (!home.avg_passes || !away.avg_passes) && (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
            Statistical averages not available for this comparison
          </div>
        )}
      </div>

      {/* Win Probability */}
      <WinProbabilityBar />
    </div>
  );
};

export default H2HComparison;

