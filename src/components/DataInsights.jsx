import { motion } from 'framer-motion';
import { useState } from 'react';
import { FaLightbulb, FaChartLine, FaFilter, FaTrophy } from 'react-icons/fa';

const DataInsights = ({ 
  teamId = null, 
  matches = [],
  customTips = null 
}) => {
  const [hoveredTip, setHoveredTip] = useState(null);

  // Default tips based on context
  const defaultTips = teamId 
    ? [
        {
          icon: FaFilter,
          text: 'Filter by result type to see wins, losses, or draws for this team',
          id: 'filter-results'
        },
        {
          icon: FaChartLine,
          text: 'Set goal filters to focus on high-scoring or low-scoring games',
          id: 'filter-goals'
        },
        {
          icon: FaTrophy,
          text: 'Toggle the charts below to compare goals scored and match results',
          id: 'toggle-charts'
        },
        {
          icon: FaLightbulb,
          text: 'Use venue filters to analyze home vs away performance',
          id: 'venue-analysis'
        }
      ]
    : [
        {
          icon: FaFilter,
          text: 'Filter by result type to see wins, losses, or draws across all teams',
          id: 'filter-results'
        },
        {
          icon: FaChartLine,
          text: 'Set goal filters to focus on high-scoring or low-scoring games',
          id: 'filter-goals'
        },
        {
          icon: FaTrophy,
          text: 'Toggle the charts below to compare goals scored and match results',
          id: 'toggle-charts'
        },
        {
          icon: FaLightbulb,
          text: 'Explore team-specific dashboards by clicking on club names',
          id: 'team-dashboards'
        },
        {
          icon: FaChartLine,
          text: 'Use the search function to quickly find specific teams or matches',
          id: 'search-function'
        }
      ];

  const tips = customTips || defaultTips;

  // Calculate dynamic insights if matches are provided
  const dynamicInsights = matches && matches.length > 0 ? {
    totalMatches: matches.length,
    avgGoals: (matches.reduce((sum, m) => sum + m.goals.home + m.goals.away, 0) / matches.length).toFixed(1),
    hasData: true
  } : null;

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15,
        bounce: 0.4,
        delay: 0.1,
        staggerChildren: 0.1,
      },
    },
  };

  const tipVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 20,
      },
    },
  };

  const description = teamId 
    ? "Explore team performance in the Premier League. Use the filters to analyze specific match outcomes."
    : "Explore the Premier League 2023/2024 season. Use the filters to analyze specific match outcomes, team performances, and goal statistics.";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-gray-100/50 dark:bg-neutral-800/50 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 mb-6 border border-gray-200/30 dark:border-neutral-700/30"
    >
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <FaLightbulb className="text-accent" />
            Data Insights
          </h2>
          <p className="text-gray-700 dark:text-gray-300 font-body leading-relaxed">
            {description}
          </p>
        </div>

        {/* Dynamic Stats (if available) */}
        {dynamicInsights && dynamicInsights.hasData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="bg-white/60 dark:bg-neutral-700/60 rounded-lg p-4 border border-gray-200/50 dark:border-neutral-600/50"
          >
            <p className="text-sm font-body text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">
                {dynamicInsights.totalMatches}
              </span>
              {' '}matches analyzed • Average{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {dynamicInsights.avgGoals}
              </span>
              {' '}goals per match
            </p>
          </motion.div>
        )}

        {/* Tips List */}
        <div className="space-y-3">
          <h3 className="text-lg font-heading font-semibold text-gray-800 dark:text-gray-200">
            Quick Tips:
          </h3>
          <ul className="space-y-2.5">
            {tips.map((tip, index) => {
              const Icon = tip.icon;
              const isHovered = hoveredTip === tip.id;

              return (
                <motion.li
                  key={tip.id}
                  variants={tipVariants}
                  className="flex items-start gap-3 group cursor-pointer"
                  onMouseEnter={() => setHoveredTip(tip.id)}
                  onMouseLeave={() => setHoveredTip(null)}
                  whileHover={{ scale: 1.02, x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className={`
                      mt-0.5 transition-colors duration-300
                      ${isHovered ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}
                    `}
                    animate={{
                      scale: isHovered ? 1.1 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <Icon className="text-sm" />
                  </motion.div>
                  <span
                    className={`
                      font-body leading-relaxed text-gray-700 dark:text-gray-300
                      transition-all duration-300
                      ${isHovered 
                        ? 'text-green-500 dark:text-green-400 underline font-semibold' 
                        : 'font-medium'
                      }
                    `}
                  >
                    {tip.text}
                  </span>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </div>
    </motion.div>
  );
};

export default DataInsights;

