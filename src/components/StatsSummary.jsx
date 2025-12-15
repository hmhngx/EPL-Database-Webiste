import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFutbol, FaUsers, FaTrophy, FaShieldAlt } from 'react-icons/fa';

const StatsSummary = ({ totalGoals, highestAttendanceMatch, teamWithMostGoals, teamWithMostConceded }) => {
  const [hoveredStat, setHoveredStat] = useState(null);
  const [tooltipVisible, setTooltipVisible] = useState(null);

  // Format highest attendance match display
  const highestAttendanceDisplay = highestAttendanceMatch && highestAttendanceMatch.attendance
    ? `${highestAttendanceMatch.home_team || 'N/A'} vs ${highestAttendanceMatch.away_team || 'N/A'}`
    : 'N/A';

  // Handle attendance - ensure it's a number and format properly
  const highestAttendanceValue = (() => {
    if (!highestAttendanceMatch || !highestAttendanceMatch.attendance) {
      return '0';
    }
    
    let attendanceNum;
    if (typeof highestAttendanceMatch.attendance === 'number') {
      attendanceNum = highestAttendanceMatch.attendance;
    } else {
      // Parse string, removing any non-numeric characters (commas, spaces, etc.)
      const cleaned = String(highestAttendanceMatch.attendance).replace(/[^0-9]/g, '');
      attendanceNum = cleaned ? parseInt(cleaned, 10) : 0;
    }
    
    return attendanceNum > 0 ? attendanceNum.toLocaleString('en-US') : '0';
  })();

  const stats = [
    {
      id: 'totalGoals',
      label: 'Total Goals',
      value: totalGoals || 0,
      icon: FaFutbol,
      color: 'text-primary',
      iconColor: 'text-primary',
      tooltip: `Total goals scored across all matches in the season: ${totalGoals || 0}`,
    },
    {
      id: 'highestAttendance',
      label: 'Highest Attendance',
      value: highestAttendanceDisplay,
      icon: FaUsers,
      color: 'text-blue-600 dark:text-blue-400',
      iconColor: 'text-blue-600 dark:text-blue-400',
      tooltip: `${highestAttendanceDisplay}: ${highestAttendanceValue} spectators`,
      subtitle: highestAttendanceValue !== '0' ? `${highestAttendanceValue} spectators` : null,
    },
    {
      id: 'mostGoals',
      label: 'Most Goals Scored',
      value: teamWithMostGoals?.team_name || 'N/A',
      icon: FaTrophy,
      color: 'text-green-600 dark:text-green-400',
      iconColor: 'text-green-600 dark:text-green-400',
      tooltip: `${teamWithMostGoals?.team_name || 'N/A'}: ${teamWithMostGoals?.gf || 0} goals scored`,
      subtitle: teamWithMostGoals?.gf ? `${teamWithMostGoals.gf} goals` : null,
    },
    {
      id: 'mostConceded',
      label: 'Most Goals Conceded',
      value: teamWithMostConceded?.team_name || 'N/A',
      icon: FaShieldAlt,
      color: 'text-red-600 dark:text-red-400',
      iconColor: 'text-red-600 dark:text-red-400',
      tooltip: `${teamWithMostConceded?.team_name || 'N/A'}: ${teamWithMostConceded?.ga || 0} goals conceded`,
      subtitle: teamWithMostConceded?.ga ? `${teamWithMostConceded.ga} goals` : null,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const statVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.95,
      y: 10,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
  };

  const tooltipVariants = {
    hidden: {
      opacity: 0,
      y: 5,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.2,
        ease: 'easeOut',
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mb-6"
    >
      <motion.div
        className="bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border border-gray-200/50 dark:border-neutral-700/50 hover:border-accent/30 hover:shadow-[0_0_20px_rgba(0,255,133,0.2)]"
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-gray-900 dark:text-white mb-6 text-center sm:text-left">
            Statistics Summary
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              const isHovered = hoveredStat === stat.id;
              
              return (
                <motion.div
                  key={stat.id}
                  variants={statVariants}
                  className="relative"
                  onMouseEnter={() => {
                    setHoveredStat(stat.id);
                    setTooltipVisible(stat.id);
                  }}
                  onMouseLeave={() => {
                    setHoveredStat(null);
                    setTooltipVisible(null);
                  }}
                >
                  <div
                    className={`
                      bg-gradient-to-br from-white/80 to-gray-50/80 dark:from-neutral-700/80 dark:to-neutral-800/80
                      rounded-lg p-4 sm:p-5
                      border border-gray-200/50 dark:border-neutral-600/50
                      transition-all duration-300 ease-in-out
                      cursor-pointer
                      ${isHovered 
                        ? 'scale-105 shadow-lg shadow-green-500/20 border-accent/50' 
                        : 'hover:scale-105 hover:shadow-md hover:shadow-green-500/10'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3">
                      <div
                        className={`
                          transition-all duration-300
                          ${isHovered 
                            ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,255,133,0.4)]' 
                            : ''
                          }
                        `}
                      >
                        <Icon 
                          className={`text-3xl sm:text-4xl ${stat.iconColor} transition-colors duration-300`}
                          aria-hidden="true"
                        />
                      </div>
                      
                      <p className="text-xs sm:text-sm font-body text-gray-600 dark:text-gray-400 font-medium">
                        {stat.label}
                      </p>
                      
                      <span
                        className={`
                          text-lg sm:text-xl font-heading font-bold
                          transition-colors duration-300
                          ${stat.color}
                          ${isHovered ? 'text-green-400 dark:text-green-300' : ''}
                          break-words text-center px-2
                        `}
                      >
                        {stat.value}
                      </span>
                      
                      {stat.subtitle && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 font-medium">
                          {stat.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tooltip */}
                  <AnimatePresence>
                    {tooltipVisible === stat.id && (
                      <motion.div
                        variants={tooltipVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 sm:w-56"
                      >
                        <div className="bg-green-100/90 dark:bg-green-900/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-green-200/50 dark:border-green-700/50">
                          <p className="text-xs sm:text-sm font-body text-gray-800 dark:text-gray-200 text-center">
                            {stat.tooltip}
                          </p>
                          {/* Tooltip arrow */}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="w-2 h-2 bg-green-100/90 dark:bg-green-900/80 border-r border-b border-green-200/50 dark:border-green-700/50 transform rotate-45"></div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StatsSummary;
