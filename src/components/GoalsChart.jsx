import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { FaCalculator, FaChartLine, FaEye, FaChartBar } from 'react-icons/fa';
import '../styles/GoalsChart.css';

const GoalsChart = ({ matches }) => {
  const [viewType, setViewType] = useState('total');
  const [showAverage, setShowAverage] = useState(true);
  const [showTrendline, setShowTrendline] = useState(false);

  const chartData = useMemo(() => {
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
    const sum = chartData.reduce((acc, item) => acc + item[viewType], 0);
    return sum / chartData.length;
  }, [chartData, viewType]);

  // Find peaks and valleys
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
    switch (viewType) {
      case 'total': return '#4CAF50';
      case 'scored': return '#2196F3';
      case 'conceded': return '#FF5722';
      case 'difference': return '#9C27B0';
      default: return '#4CAF50';
    }
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
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <div className="font-semibold text-gray-900">{data.homeTeam} vs {data.awayTeam}</div>
          <div className="text-sm text-gray-600">{data.date}</div>
          <div className="text-sm text-gray-500">{data.venue}</div>
          <div className="font-medium text-primary mt-1">
            {getViewTypeLabel()}: {data[viewType]}
          </div>
          {showTrendline && (
            <div className="text-xs text-gray-500 mt-1">
              5-Match Average: {data.trendline.toFixed(1)}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-section space-y-4">
      <div className="chart-header">
        <h2 className="text-2xl font-heading font-bold text-gray-900 mb-4">Goals per Match</h2>
        <div className="chart-controls flex flex-wrap gap-4">
          <div className="control-group flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
              <FaEye />
              <span>View Type:</span>
            </label>
            <div className="dropdown-container">
              <select 
                value={viewType} 
                onChange={(e) => setViewType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="total">Total Goals</option>
                <option value="scored">Goals Scored</option>
                <option value="conceded">Goals Conceded</option>
                <option value="difference">Goal Difference</option>
              </select>
            </div>
          </div>
          
          <div className="control-group flex gap-2">
            <button 
              className={`px-4 py-2 rounded-lg border-2 transition-colors flex items-center space-x-2 ${showAverage ? 'bg-primary text-white border-primary' : 'bg-gray-100 border-gray-300 text-gray-700'}`}
              onClick={() => setShowAverage(!showAverage)}
              title="Toggle Average Line"
            >
              <FaCalculator />
              <span>Average</span>
            </button>
            
            <button 
              className={`px-4 py-2 rounded-lg border-2 transition-colors flex items-center space-x-2 ${showTrendline ? 'bg-primary text-white border-primary' : 'bg-gray-100 border-gray-300 text-gray-700'}`}
              onClick={() => setShowTrendline(!showTrendline)}
              title="Toggle Trendline"
            >
              <FaChartLine />
              <span>Trend</span>
            </button>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={dataWithTrendline}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="matchNumber" 
            tick={{ fill: '#374151', fontSize: 10 }}
            label={{ value: 'Match Number', position: 'insideBottom', offset: -15, fill: '#374151', fontSize: 14 }}
            tickMargin={10}
            interval="preserveStartEnd"
          />
          <YAxis 
            tick={{ fill: '#374151', fontSize: 12 }}
            label={{ value: getViewTypeLabel(), angle: -90, position: 'insideLeft', fill: '#374151', fontSize: 14 }}
            tickMargin={12}
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
          
          {/* Main data line */}
          <Line 
            type="monotone" 
            dataKey={viewType} 
            stroke={getViewTypeColor()} 
            strokeWidth={3}
            dot={{ fill: getViewTypeColor(), strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: getViewTypeColor(), strokeWidth: 2 }}
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
              label={{ value: `Avg: ${average.toFixed(1)}`, position: 'insideTopRight', fill: '#ff9800' }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      
      {/* Peak/Valley labels */}
      <div className="chart-insights flex flex-wrap gap-2 mt-4">
        {peaks.filter(item => item.isPeak || item.isValley).map((item, index) => (
          <div key={index} className={`px-3 py-1 rounded-full text-sm font-medium ${
            item.isPeak 
              ? 'bg-green-100 text-green-700 border border-green-300' 
              : 'bg-red-100 text-red-700 border border-red-300'
          }`}>
            <span className="insight-label">
              {item.isPeak ? 'Peak' : 'Lowest'}: Match #{item.matchNumber}
            </span>
            <span className="insight-value ml-2 font-bold">{item[viewType]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GoalsChart;