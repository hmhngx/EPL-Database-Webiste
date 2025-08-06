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
      const isHome = match.teams.home.id === 33;
      const homeGoals = match.goals.home;
      const awayGoals = match.goals.away;
      
      return {
        matchNumber: index + 1,
        name: new Date(match.fixture.date).toLocaleDateString(),
        total: homeGoals + awayGoals,
        scored: isHome ? homeGoals : awayGoals,
        conceded: isHome ? awayGoals : homeGoals,
        difference: (isHome ? homeGoals : awayGoals) - (isHome ? awayGoals : homeGoals),
        opponent: isHome ? match.teams.away.name : match.teams.home.name,
        venue: isHome ? 'Home' : 'Away',
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
        <div className="custom-tooltip">
          <div className="tooltip-title">{data.opponent}</div>
          <div className="tooltip-date">{data.date}</div>
          <div className="tooltip-match">{data.venue} Match</div>
          <div className="tooltip-value">
            {getViewTypeLabel()}: {data[viewType]}
          </div>
          {showTrendline && (
            <div className="tooltip-trendline">
              5-Match Average: {data.trendline.toFixed(1)}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-section">
      <div className="chart-header">
        <h2>Goals per Match</h2>
        <div className="chart-controls">
          <div className="control-group">
            <label>
              <FaEye className="control-icon" />
              View Type:
            </label>
            <div className="dropdown-container">
              <select 
                value={viewType} 
                onChange={(e) => setViewType(e.target.value)}
                className="view-selector"
              >
                <option value="total">Total Goals</option>
                <option value="scored">Goals Scored</option>
                <option value="conceded">Goals Conceded</option>
                <option value="difference">Goal Difference</option>
              </select>
            </div>
          </div>
          
          <div className="control-group">
            <button 
              className={`toggle-btn ${showAverage ? 'active' : ''}`}
              onClick={() => setShowAverage(!showAverage)}
              title="Toggle Average Line"
            >
              {showAverage ? <FaCalculator /> : <FaCalculator />}
              <span>Average</span>
            </button>
            
            <button 
              className={`toggle-btn ${showTrendline ? 'active' : ''}`}
              onClick={() => setShowTrendline(!showTrendline)}
              title="Toggle Trendline"
            >
              {showTrendline ? <FaChartLine /> : <FaChartLine />}
              <span>Trend</span>
            </button>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={dataWithTrendline}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis 
            dataKey="matchNumber" 
            tick={{ fill: '#fff', fontSize: 10 }}
            label={{ value: 'Match Number', position: 'insideBottom', offset: -15, fill: '#fff', fontSize: 14 }}
            tickMargin={10}
            interval="preserveStartEnd"
          />
          <YAxis 
            tick={{ fill: '#fff', fontSize: 12 }}
            label={{ value: getViewTypeLabel(), angle: -90, position: 'insideLeft', fill: '#fff', fontSize: 14 }}
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
      <div className="chart-insights">
        {peaks.filter(item => item.isPeak || item.isValley).map((item, index) => (
          <div key={index} className={`insight-item ${item.isPeak ? 'peak' : 'valley'}`}>
            <span className="insight-label">
              {item.isPeak ? 'Peak' : 'Lowest'}: Match #{item.matchNumber}
            </span>
            <span className="insight-value">{item[viewType]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GoalsChart;