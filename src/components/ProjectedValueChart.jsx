import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { FaChartLine, FaInfoCircle } from 'react-icons/fa';

/**
 * ProjectedValueChart Component
 * Displays a player's projected market value over the next 5 years
 * Based on age-curve analysis and statistical modeling
 * 
 * @param {Object} props
 * @param {Array} props.projections - Array of {year, age, projectedValue, projectedRating}
 * @param {Object} props.player - Player object with name and current stats
 * @param {Object} props.ageCurve - Age curve analysis object
 */
const ProjectedValueChart = ({ projections, player, ageCurve }) => {
  const [showRating, setShowRating] = useState(false);

  if (!projections || projections.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
        <p className="text-white/60">No projection data available</p>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      // Safely access values with fallbacks
      const displayValue = data.value || data.projectedValue || 0;
      const displayRating = data.rating || data.projectedRating || 0;
      
      return (
        <div className="bg-black/90 backdrop-blur-md border border-[#00FF85]/30 rounded-lg p-4 shadow-2xl">
          <p className="text-white font-semibold mb-2">Year {data.year || 'N/A'}</p>
          <p className="text-white/80 text-sm mb-1">Age: {data.age || 'N/A'}</p>
          <p className="text-[#00FF85] font-bold text-lg">
            €{Number(displayValue).toFixed(1)}M
          </p>
          <p className="text-white/60 text-xs mt-1">
            Rating: {Number(displayRating).toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Prepare data for chart
  const chartData = projections.map(p => ({
    year: p.year ? p.year.toString() : 'N/A',
    age: p.age || 0,
    value: p.projectedValue ? parseFloat(Number(p.projectedValue).toFixed(1)) : 0,
    rating: p.projectedRating || 0,
    label: `${p.year || 'N/A'} (${p.age || 0}y)`
  }));

  // Calculate peak value and year
  const peakProjection = projections.reduce((max, p) => {
    const pValue = p.projectedValue || 0;
    const maxValue = max.projectedValue || 0;
    return pValue > maxValue ? p : max;
  }, projections[0]);

  const currentValue = projections[0]?.projectedValue || 0;
  const peakValue = peakProjection?.projectedValue || 0;
  const valueChange = currentValue > 0 
    ? (((peakValue - currentValue) / currentValue) * 100).toFixed(1)
    : '0.0';
  const valueDirection = parseFloat(valueChange) >= 0 ? 'increase' : 'decrease';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#00FF85]/10 rounded-lg">
              <FaChartLine className="text-2xl text-[#00FF85]" />
            </div>
            <div>
              <h3 className="text-xl font-heading font-bold text-white">
                5-Year Market Value Projection
              </h3>
              <p className="text-white/60 text-sm">
                Based on age-curve analysis and statistical modeling
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-white/60 text-xs mb-1">Current Value</p>
            <p className="text-white font-bold text-lg">
              €{Number(currentValue).toFixed(1)}M
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-white/60 text-xs mb-1">Peak Value (Age {peakProjection?.age || 'N/A'})</p>
            <p className="text-[#00FF85] font-bold text-lg">
              €{Number(peakValue).toFixed(1)}M
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-white/60 text-xs mb-1">Projected {valueDirection === 'increase' ? 'Growth' : 'Change'}</p>
            <p className={`font-bold text-lg ${valueDirection === 'increase' ? 'text-green-400' : 'text-orange-400'}`}>
              {parseFloat(valueChange) >= 0 ? '+' : ''}{valueChange}%
            </p>
          </div>
        </div>

        {/* Toggle */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setShowRating(!showRating)}
            className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-white/80 transition-all"
          >
            Show {showRating ? 'Market Value' : 'Performance Rating'}
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00FF85" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00FF85" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="label"
              stroke="rgba(255,255,255,0.5)"
              style={{ fontSize: '12px' }}
              tick={{ fill: 'rgba(255,255,255,0.7)' }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.5)"
              style={{ fontSize: '12px' }}
              tick={{ fill: 'rgba(255,255,255,0.7)' }}
              label={{
                value: showRating ? 'Rating' : 'Market Value (€M)',
                angle: -90,
                position: 'insideLeft',
                style: { fill: 'rgba(255,255,255,0.7)', fontSize: '12px' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={showRating ? 'rating' : 'value'}
              stroke="#00FF85"
              strokeWidth={3}
              fill="url(#colorValue)"
              dot={{
                fill: '#00FF85',
                strokeWidth: 2,
                r: 5,
                stroke: '#000'
              }}
              activeDot={{
                r: 7,
                fill: '#00FF85',
                stroke: '#000',
                strokeWidth: 2
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Context Information */}
      <div className="p-6 bg-white/5 border-t border-white/10">
        <div className="flex items-start space-x-3">
          <FaInfoCircle className="text-[#00FF85] mt-1 flex-shrink-0" />
          <div className="text-sm text-white/70">
            <p className="mb-2">
              <span className="font-semibold text-white">Career Phase:</span>{' '}
              <span className={`
                ${ageCurve.currentPhase === 'development' ? 'text-blue-400' : ''}
                ${ageCurve.currentPhase === 'peak' ? 'text-[#00FF85]' : ''}
                ${ageCurve.currentPhase === 'decline' ? 'text-orange-400' : ''}
              `}>
                {ageCurve.currentPhase.charAt(0).toUpperCase() + ageCurve.currentPhase.slice(1)}
              </span>
            </p>
            <p>
              {ageCurve.description}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectedValueChart;
