import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaFutbol, FaTimesCircle, FaExclamationTriangle, FaSubscript } from 'react-icons/fa';

/**
 * Match Timeline Component
 * Displays minute-by-minute match events (goals, cards, substitutions)
 * 
 * @param {Array} events - Array of match events from match_events table
 * @param {string} homeTeam - Home team name
 * @param {string} awayTeam - Away team name
 */
const MatchTimeline = ({ events = [], homeTeam = '', awayTeam = '' }) => {
  if (!events || events.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-white mb-4">
          Match Timeline
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-4">
          No match events available
        </p>
      </div>
    );
  }

  // Sort events by minute
  const sortedEvents = [...events].sort((a, b) => {
    const minuteA = parseInt(a.minute || 0);
    const minuteB = parseInt(b.minute || 0);
    return minuteA - minuteB;
  });

  // Get event icon and color based on event type, is_penalty, and is_own_goal
  const getEventIcon = (eventType, isOwnGoal = false, isPenalty = false) => {
    const type = (eventType || '').toLowerCase();
    
    // Handle goals with special cases
    if (type.includes('goal')) {
      if (isOwnGoal) {
        // Own goal - red ball icon
        return { icon: FaFutbol, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' };
      } else if (isPenalty) {
        // Penalty goal - special styling (could use different icon if available)
        return { icon: FaFutbol, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' };
      } else {
        // Regular goal
        return { icon: FaFutbol, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' };
      }
    } else if (type.includes('red') || type.includes('red card')) {
      return { icon: FaTimesCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' };
    } else if (type.includes('yellow') || type.includes('yellow card')) {
      return { icon: FaExclamationTriangle, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30' };
    } else if (type.includes('sub') || type.includes('substitution')) {
      return { icon: FaSubscript, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' };
    } else if (type.includes('assist')) {
      return { icon: FaFutbol, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' };
    }
    
    // Default
    return { icon: FaFutbol, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-900/30' };
  };

  // Determine if event is for home or away team
  const getTeamSide = (teamName) => {
    if (!teamName) return 'neutral';
    const team = (teamName || '').toLowerCase();
    const home = (homeTeam || '').toLowerCase();
    const away = (awayTeam || '').toLowerCase();
    
    if (team === home || team.includes(home) || home.includes(team)) {
      return 'home';
    } else if (team === away || team.includes(away) || away.includes(team)) {
      return 'away';
    }
    return 'neutral';
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-white mb-6">
        Match Timeline
      </h3>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-neutral-600"></div>
        
        <div className="space-y-4">
          {sortedEvents.map((event, index) => {
            const isOwnGoal = event.is_own_goal === true || event.is_own_goal === 'true';
            const isPenalty = event.is_penalty === true || event.is_penalty === 'true';
            const { icon: EventIcon, color, bg } = getEventIcon(event.event_type, isOwnGoal, isPenalty);
            const minute = event.minute || 0;
            const playerName = event.player_name || 'Unknown';
            const teamName = event.team_name || '';
            const eventType = event.event_type || 'Event';
            const side = getTeamSide(teamName);
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`relative flex items-center gap-4 ${
                  side === 'home' ? 'flex-row' : side === 'away' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Event icon */}
                <div className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full ${bg} border-2 border-white dark:border-neutral-800`}>
                  <EventIcon className={`text-xl ${color}`} />
                </div>
                
                {/* Event details */}
                <div className={`flex-1 ${side === 'away' ? 'text-right' : 'text-left'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {minute}'
                    </span>
                    {event.player_id && playerName !== 'Unknown' ? (
                      <Link
                        to={`/players/${event.player_id}`}
                        className="text-base font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                      >
                        {playerName}
                      </Link>
                    ) : (
                      <span className="text-base font-semibold text-gray-900 dark:text-white">
                        {playerName}
                      </span>
                    )}
                    {teamName && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({teamName})
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {eventType}
                    {isOwnGoal && ' (Own Goal)'}
                    {isPenalty && eventType.toLowerCase().includes('goal') && ' (Penalty)'}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MatchTimeline;

