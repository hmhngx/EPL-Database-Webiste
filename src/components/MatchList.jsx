import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaCalendarAlt, FaTrophy, FaTimes, FaHandshake } from 'react-icons/fa';

const MatchList = ({ matches }) => {
  if (!matches || matches.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No matches found.</p>
      </div>
    );
  }

  const getResultIcon = (match) => {
    const homeGoals = match.goals.home;
    const awayGoals = match.goals.away;
    
    if (homeGoals > awayGoals) {
      return { icon: FaTrophy, color: 'text-green-600 dark:text-green-400', result: 'Home Win' };
    } else if (awayGoals > homeGoals) {
      return { icon: FaTimes, color: 'text-red-600 dark:text-red-400', result: 'Away Win' };
    } else {
      return { icon: FaHandshake, color: 'text-yellow-600 dark:text-yellow-400', result: 'Draw' };
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      {/* Desktop Table View (md and above) */}
      <div className="hidden md:block overflow-x-auto">
        <div className="min-w-full rounded-xl overflow-hidden border border-gray-200/50 dark:border-neutral-700/50">
          <table className="min-w-full divide-y divide-gray-200/50 dark:divide-neutral-700/50">
            <thead className="sticky top-0 z-10 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-heading font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-4 text-left text-xs font-heading font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Match
                </th>
                <th className="px-6 py-4 text-center text-xs font-heading font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-4 text-center text-xs font-heading font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Result
                </th>
                <th className="px-6 py-4 text-center text-xs font-heading font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Venue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200/50 dark:divide-neutral-700/50">
              {matches.map((match, index) => {
                const date = new Date(match.fixture.date);
                const formattedDate = date.toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                });
                const formattedTime = date.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                });
                const resultInfo = getResultIcon(match);
                const ResultIcon = resultInfo.icon;
                const isOdd = index % 2 === 0;

                return (
                  <motion.tr
                    key={match.fixture.id}
                    variants={rowVariants}
                    className={`
                      ${isOdd ? 'bg-gray-50/80 dark:bg-neutral-700/80' : 'bg-white dark:bg-neutral-900'}
                      hover:bg-green-50/50 dark:hover:bg-green-900/50
                      transition-all duration-300
                      group
                    `}
                    whileHover={{ scale: 1.02 }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/match/${match.fixture.id}`}
                        className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors"
                      >
                        <FaCalendarAlt className="text-xs" />
                        <span>{formattedDate}</span>
                        <span className="text-xs">{formattedTime}</span>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/match/${match.fixture.id}`}
                        className="block space-y-1 group-hover:text-gray-900 dark:group-hover:text-white transition-colors"
                      >
                        <div className="text-sm font-body font-semibold text-gray-900 dark:text-white">
                          {match.teams.home.name}
                        </div>
                        <div className="text-sm font-body font-semibold text-gray-900 dark:text-white">
                          {match.teams.away.name}
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Link
                        to={`/match/${match.fixture.id}`}
                        className="inline-block"
                      >
                        <div className="text-lg font-heading font-bold text-primary dark:text-accent">
                          {match.goals.home} - {match.goals.away}
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Link
                        to={`/match/${match.fixture.id}`}
                        className="inline-flex items-center justify-center"
                      >
                        <motion.div
                          className={`
                            ${resultInfo.color}
                            transition-all duration-300
                            group-hover:text-blue-400
                          `}
                          whileHover={{ 
                            scale: 1.2,
                            filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))'
                          }}
                        >
                          <ResultIcon className="text-xl" />
                        </motion.div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Link
                        to={`/match/${match.fixture.id}`}
                        className="inline-flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors"
                      >
                        <FaMapMarkerAlt className="text-sm" />
                      </Link>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View (sm and below) */}
      <div className="md:hidden space-y-4">
        {matches.map((match, index) => {
          const date = new Date(match.fixture.date);
          const formattedDate = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
          const formattedTime = date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          const resultInfo = getResultIcon(match);
          const ResultIcon = resultInfo.icon;
          const isOdd = index % 2 === 0;

          return (
            <motion.div
              key={match.fixture.id}
              variants={rowVariants}
              className={`
                ${isOdd ? 'bg-gray-50/80 dark:bg-neutral-700/80' : 'bg-white dark:bg-neutral-900'}
                rounded-xl
                border border-gray-200/50 dark:border-neutral-700/50
                hover:border-secondary/50
                hover:bg-green-50/50 dark:hover:bg-green-900/50
                shadow-sm hover:shadow-md
                transition-all duration-300
                group
                overflow-hidden
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                to={`/match/${match.fixture.id}`}
                className="block p-4"
              >
                {/* Header with Date and Result Icon */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <FaCalendarAlt className="text-xs" />
                    <span>{formattedDate}</span>
                    <span className="text-xs">{formattedTime}</span>
                  </div>
                  <motion.div
                    className={`
                      ${resultInfo.color}
                      transition-all duration-300
                      group-hover:text-blue-400
                    `}
                    whileHover={{ 
                      scale: 1.2,
                      filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))'
                    }}
                  >
                    <ResultIcon className="text-xl" />
                  </motion.div>
                </div>

                {/* Match Details */}
                <div className="space-y-3">
                  {/* Home Team */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-body font-semibold text-gray-900 dark:text-white flex-1">
                      {match.teams.home.name}
                    </span>
                    <span className="text-lg font-heading font-bold text-primary dark:text-accent ml-4">
                      {match.goals.home}
                    </span>
                  </div>

                  {/* Away Team */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-body font-semibold text-gray-900 dark:text-white flex-1">
                      {match.teams.away.name}
                    </span>
                    <span className="text-lg font-heading font-bold text-primary dark:text-accent ml-4">
                      {match.goals.away}
                    </span>
                  </div>
                </div>

                {/* Footer with Venue */}
                <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-neutral-700/50 flex items-center justify-center">
                  <FaMapMarkerAlt className="text-xs text-gray-400 dark:text-gray-500" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default MatchList;
