import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { FaCalculator, FaChartLine, FaEye, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const GoalsChart = ({ matches }) => {
  const [viewType, setViewType] = useState('total');
  const [showAverage, setShowAverage] = useState(true);
  const [showTrendline, setShowTrendline] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hoveredLine, setHoveredLine] = useState(false);

  const chartData = useMemo(() => {
    if (!matches || matches.length === 0) return [];
    
    return matches.map((match, index) => {
      const homeGoals = match.goals.home;
      const awayGoals = match.goals.away;
      
      return {
        matchNumber: index + 1,
        name: new Date(match.fixture.date).toLocaleDateString(),
        total: homeGoals + awayGoals,
        scored: homeGoals,
        conceded: awayGoals,
        difference: homeGoals - awayGoals,
        homeTeam: match.teams.home.name,
        awayTeam: match.teams.away.name,
        venue: 'League Match',
        date: new Date(match.fixture.date).toLocaleDateString()
      };
    });
  }, [matches]);

  // Calculate trendline data
  const dataWithTrendline = useMemo(() => {
    return chartData.map((item, index) => {
      const windowSize = 5;
      const start = Math.max(0, index - windowSize + 1);
      const end = index + 1;
      const windowData = chartData.slice(start, end);
      const sum = windowData.reduce((acc, data) => acc + data[viewType], 0);
      const average = sum / windowData.length;
      
      return {
        ...item,
        trendline: average
      };
    });
  }, [chartData, viewType]);

  // Calculate overall average
  const average = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, item) => acc + item[viewType], 0);
    return sum / chartData.length;
  }, [chartData, viewType]);

  // Find peaks for green markers
  const peaks = useMemo(() => {
    return chartData.map((item, index) => {
      const current = item[viewType];
      const prev = index > 0 ? chartData[index - 1][viewType] : current;
      const next = index < chartData.length - 1 ? chartData[index + 1][viewType] : current;
      
      return {
        ...item,
        isPeak: current > prev && current > next,
        isValley: current < prev && current < next
      };
    });
  }, [chartData, viewType]);

  const getViewTypeColor = () => {
    return '#38003C'; // EPL Purple
  };

  const getViewTypeLabel = () => {
    switch (viewType) {
      case 'total': return 'Total Goals';
      case 'scored': return 'Goals Scored';
      case 'conceded': return 'Goals Conceded';
      case 'difference': return 'Goal Difference';
      default: return 'Total Goals';
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white/95 dark:bg-neutral-800/95 backdrop-blur-sm p-3 rounded-md shadow-sm border border-gray-200/50 dark:border-neutral-700/50"
        >
          <div className="font-heading font-semibold text-gray-900 dark:text-white text-sm">
            {data.homeTeam} vs {data.awayTeam}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{data.date}</div>
          <div className="text-xs text-gray-500 dark:text-gray-500">{data.venue}</div>
          <div className="font-heading font-bold text-primary dark:text-accent mt-2 text-sm">
            {getViewTypeLabel()}: {data[viewType]}
          </div>
          {showTrendline && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              5-Match Average: {data.trendline?.toFixed(1) || 'N/A'}
            </div>
          )}
        </motion.div>
      );
    }
    return null;
  };

  // Custom dot component with hover effects
  const CustomDot = useCallback((props) => {
    const { cx, cy, payload } = props;
    const isPeak = peaks.find(p => p.matchNumber === payload.matchNumber)?.isPeak;
    const isHovered = hoveredPoint === payload.matchNumber;
    
    return (
      <motion.circle
        cx={cx}
        cy={cy}
        r={isPeak ? 6 : 4}
        fill={isPeak ? '#00FF85' : '#38003C'}
        stroke={isPeak ? '#00FF85' : '#38003C'}
        strokeWidth={isHovered ? 3 : 2}
        initial={{ scale: 1 }}
        animate={{ 
          scale: isHovered ? 1.25 : 1,
          filter: isHovered ? 'drop-shadow(0 0 8px rgba(0, 255, 133, 0.6))' : 'none'
        }}
        transition={{ duration: 0.2 }}
        onMouseEnter={() => setHoveredPoint(payload.matchNumber)}
        onMouseLeave={() => setHoveredPoint(null)}
        style={{ cursor: 'pointer' }}
      />
    );
  }, [peaks, hoveredPoint]);

  // Custom active dot with enhanced hover
  const CustomActiveDot = useCallback((props) => {
    const { cx, cy } = props;
    return (
      <motion.circle
        cx={cx}
        cy={cy}
        r={8}
        fill="#00FF85"
        stroke="#38003C"
        strokeWidth={3}
        initial={{ scale: 1 }}
        animate={{ 
          scale: [1, 1.3, 1],
          filter: 'drop-shadow(0 0 12px rgba(0, 255, 133, 0.8))'
        }}
        transition={{ 
          duration: 0.6,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
    );
  }, []);

  const containerVariants = {
    expanded: {
      height: 'auto',
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: 'easeOut'
      }
    },
    collapsed: {
      height: 0,
      opacity: 0,
      transition: {
        duration: 0.4,
        ease: 'easeIn'
      }
    }
  };

  if (!matches || matches.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200/50 dark:border-neutral-700/50 overflow-hidden"
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-6">
        {/* Header with toggle */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
            Goals per Match
          </h2>
          <motion.button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label={isExpanded ? 'Collapse chart' : 'Expand chart'}
          >
            {isExpanded ? (
              <FaChevronUp className="text-gray-600 dark:text-gray-400" />
            ) : (
              <FaChevronDown className="text-gray-600 dark:text-gray-400" />
            )}
          </motion.button>
        </div>

        {/* Controls */}
        <div className="chart-controls flex flex-wrap gap-4 mb-4">
          <div className="control-group flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <FaEye />
              <span>View Type:</span>
            </label>
            <select 
              value={viewType} 
              onChange={(e) => setViewType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-300 focus:border-green-400 transition-all duration-300"
            >
              <option value="total">Total Goals</option>
              <option value="scored">Goals Scored</option>
              <option value="conceded">Goals Conceded</option>
              <option value="difference">Goal Difference</option>
            </select>
          </div>
          
          <div className="control-group flex gap-2">
            <motion.button 
              className={`px-4 py-2 rounded-lg border-2 transition-all duration-300 flex items-center space-x-2 ${
                showAverage 
                  ? 'bg-primary text-white border-primary' 
                  : 'bg-gray-100 dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => setShowAverage(!showAverage)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Toggle Average Line"
            >
              <FaCalculator />
              <span>Average</span>
            </motion.button>
            
            <motion.button 
              className={`px-4 py-2 rounded-lg border-2 transition-all duration-300 flex items-center space-x-2 ${
                showTrendline 
                  ? 'bg-primary text-white border-primary' 
                  : 'bg-gray-100 dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => setShowTrendline(!showTrendline)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Toggle Trendline"
            >
              <FaChartLine />
              <span>Trend</span>
            </motion.button>
          </div>
        </div>

        {/* Chart with expand/collapse animation */}
        <AnimatePresence>
          {isExpanded && (
              <motion.div
              variants={containerVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              className="overflow-hidden"
            >
              <div 
                className="w-full"
                style={{ height: '400px' }}
                onMouseEnter={() => setHoveredLine(true)}
                onMouseLeave={() => setHoveredLine(false)}
              >
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={dataWithTrendline}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="#e5e7eb" 
                        opacity={0.3}
                      />
                      <XAxis 
                        dataKey="matchNumber" 
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        label={{ 
                          value: 'Match Number', 
                          position: 'insideBottom', 
                          offset: -10, 
                          fill: '#6b7280', 
                          fontSize: 12 
                        }}
                        tickMargin={8}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        label={{ 
                          value: getViewTypeLabel(), 
                          angle: -90, 
                          position: 'insideLeft', 
                          fill: '#6b7280', 
                          fontSize: 12 
                        }}
                        tickMargin={10}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        wrapperStyle={{
                          paddingTop: '20px',
                          fontSize: '12px'
                        }}
                      />
                      
                      {/* Main data line with purple color and hover effects */}
                      <Line 
                        type="monotone" 
                        dataKey={viewType} 
                        stroke="#38003C"
                        strokeWidth={hoveredLine ? 4 : 3}
                        dot={<CustomDot />}
                        activeDot={<CustomActiveDot />}
                        name={getViewTypeLabel()}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          transition: 'stroke-width 0.3s ease',
                          filter: hoveredLine ? 'drop-shadow(0 0 4px rgba(56, 0, 60, 0.3))' : 'none'
                        }}
                      />
                      
                      {/* Trendline */}
                      {showTrendline && (
                        <Line 
                          type="monotone" 
                          dataKey="trendline" 
                          stroke="#ffa726" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          name="5-Match Average"
                        />
                      )}
                      
                      {/* Average reference line */}
                      {showAverage && (
                        <ReferenceLine 
                          y={average} 
                          stroke="#ff9800" 
                          strokeDasharray="3 3"
                          strokeWidth={2}
                          label={{ 
                            value: `Avg: ${average.toFixed(1)}`, 
                            position: 'insideTopRight', 
                            fill: '#ff9800',
                            fontSize: 12
                          }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Peak/Valley labels */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="chart-insights flex flex-wrap gap-2 mt-4"
          >
            {peaks.filter(item => item.isPeak || item.isValley).slice(0, 5).map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  item.isPeak 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700'
                }`}
              >
                <span className="insight-label">
                  {item.isPeak ? 'Peak' : 'Lowest'}: Match #{item.matchNumber}
                </span>
                <span className="insight-value ml-2 font-bold">{item[viewType]}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default GoalsChart;
