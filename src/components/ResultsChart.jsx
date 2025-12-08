import React, { useState, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FaTrophy, FaTimes, FaHandshake, FaEye, FaEyeSlash } from 'react-icons/fa';
import '../styles/ResultsChart.css';

const ResultsChart = ({ matches }) => {
  const [showHomeWins, setShowHomeWins] = useState(true);
  const [showAwayWins, setShowAwayWins] = useState(true);
  const [showDraws, setShowDraws] = useState(true);
  const [showStreaks, setShowStreaks] = useState(true);

  const chartData = useMemo(() => {
    return matches.map((match, index) => {
      const homeGoals = match.goals.home;
      const awayGoals = match.goals.away;
      
      let result, resultValue, color, icon;
      if (homeGoals > awayGoals) {
        result = 'Home Win';
        resultValue = 3;
        color = '#4CAF50';
        icon = <FaTrophy />;
      } else if (awayGoals > homeGoals) {
        result = 'Away Win';
        resultValue = 1;
        color = '#F44336';
        icon = <FaTimes />;
      } else {
        result = 'Draw';
        resultValue = 2;
        color = '#FFC107';
        icon = <FaHandshake />;
      }

      return {
        matchNumber: index + 1,
        date: new Date(match.fixture.date).toLocaleDateString(),
        result,
        resultValue,
        color,
        icon,
        homeTeam: match.teams.home.name,
        awayTeam: match.teams.away.name,
        homeGoals,
        awayGoals,
        score: `${homeGoals}-${awayGoals}`,
        venue: 'League Match'
      };
    });
  }, [matches]);

  // Calculate streaks
  const dataWithStreaks = useMemo(() => {
    if (!showStreaks) return chartData;

    return chartData.map((item, index) => {
      let currentStreak = 1;
      let streakType = item.result;
      
      // Look backwards for streak (normalize Win types)
      const normalizedResult = item.result.includes('Win') ? 'Win' : item.result;
      for (let i = index - 1; i >= 0; i--) {
        const normalizedPrevResult = chartData[i].result.includes('Win') ? 'Win' : chartData[i].result;
        if (normalizedPrevResult === normalizedResult) {
          currentStreak++;
        } else {
          break;
        }
      }

      return {
        ...item,
        currentStreak,
        streakType,
        isStreakStart: index === 0 || (() => {
          const prevResult = chartData[index - 1]?.result || '';
          const normalizedPrev = prevResult.includes('Win') ? 'Win' : prevResult;
          const normalizedCurrent = item.result.includes('Win') ? 'Win' : item.result;
          return normalizedPrev !== normalizedCurrent;
        })()
      };
    });
  }, [chartData, showStreaks]);

  // Calculate statistics
  const stats = useMemo(() => {
    const homeWins = chartData.filter(item => item.result === 'Home Win').length;
    const awayWins = chartData.filter(item => item.result === 'Away Win').length;
    const draws = chartData.filter(item => item.result === 'Draw').length;
    const total = chartData.length;
    const totalWins = homeWins + awayWins;

    return {
      homeWins,
      awayWins,
      totalWins,
      draws,
      total,
      winRate: total > 0 ? ((totalWins / total) * 100).toFixed(1) : '0',
      drawRate: total > 0 ? ((draws / total) * 100).toFixed(1) : '0'
    };
  }, [chartData]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-title">Match #{data.matchNumber}</p>
          <p className="tooltip-date">{data.date}</p>
          <p className="tooltip-match">
            {data.homeTeam} {data.homeGoals} - {data.awayGoals} {data.awayTeam}
          </p>
          <p className="tooltip-opponent">{data.venue}</p>
          <p className="tooltip-result" style={{color: data.color}}>
            {data.icon} {data.result}
          </p>
          {showStreaks && data.currentStreak > 1 && (
            <p className="tooltip-streak">
              {data.streakType} Streak: {data.currentStreak} matches
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomScatter = (props) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;
    
    // Determine opacity based on filter settings
    let opacity = 1;
    if (payload.result === 'Home Win' && !showHomeWins) opacity = 0.3;
    if (payload.result === 'Away Win' && !showAwayWins) opacity = 0.3;
    if (payload.result === 'Draw' && !showDraws) opacity = 0.3;
    
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill={payload.color}
          stroke="#fff"
          strokeWidth={2}
          className="result-dot"
          style={{ opacity }}
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dy="0.3em"
          fill="#fff"
          fontSize="8"
          fontWeight="bold"
          style={{ opacity }}
        >
          {payload.result === 'Home Win' ? 'HW' : payload.result === 'Away Win' ? 'AW' : 'D'}
        </text>
      </g>
    );
  };

  // Debug: Log the data to see what's being passed
  console.log('Chart Data:', dataWithStreaks);
  console.log('Matches count:', matches.length);
  console.log('Chart data count:', dataWithStreaks.length);

  return (
    <div className="chart-section space-y-4">
      <div className="chart-header">
        <h2 className="text-2xl font-heading font-bold text-gray-900 mb-4">Match Results Over Time</h2>
        <div className="chart-controls flex flex-wrap gap-4">
          <div className="control-group flex flex-wrap gap-2">
            <button 
              className={`toggle-btn px-4 py-2 rounded-lg border-2 transition-colors flex items-center space-x-2 ${showHomeWins ? 'bg-green-100 border-green-500 text-green-700' : 'bg-gray-100 border-gray-300 text-gray-700'}`}
              onClick={() => setShowHomeWins(!showHomeWins)}
            >
              <FaTrophy />
              <span>Home Wins ({stats.homeWins})</span>
            </button>
            
            <button 
              className={`toggle-btn px-4 py-2 rounded-lg border-2 transition-colors flex items-center space-x-2 ${showAwayWins ? 'bg-green-100 border-green-500 text-green-700' : 'bg-gray-100 border-gray-300 text-gray-700'}`}
              onClick={() => setShowAwayWins(!showAwayWins)}
            >
              <FaTrophy />
              <span>Away Wins ({stats.awayWins})</span>
            </button>
            
            <button 
              className={`toggle-btn px-4 py-2 rounded-lg border-2 transition-colors flex items-center space-x-2 ${showDraws ? 'bg-yellow-100 border-yellow-500 text-yellow-700' : 'bg-gray-100 border-gray-300 text-gray-700'}`}
              onClick={() => setShowDraws(!showDraws)}
            >
              <FaHandshake />
              <span>Draws ({stats.draws})</span>
            </button>
          </div>
          
          <div className="control-group">
            <button 
              className={`toggle-btn px-4 py-2 rounded-lg border-2 transition-colors flex items-center space-x-2 ${showStreaks ? 'bg-primary text-white border-primary' : 'bg-gray-100 border-gray-300 text-gray-700'}`}
              onClick={() => setShowStreaks(!showStreaks)}
              title="Toggle Streak Visualization"
            >
              {showStreaks ? <FaEye /> : <FaEyeSlash />}
              <span>Streaks</span>
            </button>
          </div>
        </div>
      </div>

      <div className="stats-summary grid grid-cols-3 gap-4">
        <div className="stat-card bg-white rounded-lg p-4 shadow border border-gray-200 text-center">
          <span className="stat-label block text-sm text-gray-600 mb-1">Win Rate</span>
          <span className="stat-value text-2xl font-bold text-primary">{stats.winRate}%</span>
        </div>
        <div className="stat-card bg-white rounded-lg p-4 shadow border border-gray-200 text-center">
          <span className="stat-label block text-sm text-gray-600 mb-1">Draw Rate</span>
          <span className="stat-value text-2xl font-bold text-yellow-600">{stats.drawRate}%</span>
        </div>
        <div className="stat-card bg-white rounded-lg p-4 shadow border border-gray-200 text-center">
          <span className="stat-label block text-sm text-gray-600 mb-1">Total Matches</span>
          <span className="stat-value text-2xl font-bold text-gray-900">{stats.total}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart data={dataWithStreaks}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="matchNumber" 
            type="number"
            tick={{ fill: '#374151', fontSize: 10 }}
            label={{ value: 'Match Number', position: 'insideBottom', offset: -15, fill: '#374151', fontSize: 14 }}
            domain={[0, 'dataMax + 1']}
            tickMargin={8}
            interval="preserveStartEnd"
          />
          <YAxis 
            type="number"
            tick={{ fill: '#374151', fontSize: 12 }}
            domain={[0.5, 3.5]}
            tickFormatter={(value) => {
              if (value === 1) return 'Away Win';
              if (value === 2) return 'Draw';
              if (value === 3) return 'Home Win';
              return '';
            }}
            label={{ value: 'Result', angle: -90, position: 'insideLeft', fill: '#374151', fontSize: 14 }}
            tickMargin={10}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <Scatter 
            data={dataWithStreaks} 
            shape={<CustomScatter />}
            dataKey="resultValue"
            fill="#8884d8"
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Chart Legend */}
      <div className="chart-legend flex flex-wrap gap-4 justify-center mt-4">
        <div className="legend-item flex items-center space-x-2">
          <div className={`w-4 h-4 rounded-full ${showHomeWins ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <span className="text-sm text-gray-700">Home Wins {showHomeWins ? '(Highlighted)' : '(Dimmed)'}</span>
        </div>
        <div className="legend-item flex items-center space-x-2">
          <div className={`w-4 h-4 rounded-full ${showAwayWins ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <span className="text-sm text-gray-700">Away Wins {showAwayWins ? '(Highlighted)' : '(Dimmed)'}</span>
        </div>
        <div className="legend-item flex items-center space-x-2">
          <div className={`w-4 h-4 rounded-full ${showDraws ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
          <span className="text-sm text-gray-700">Draws {showDraws ? '(Highlighted)' : '(Dimmed)'}</span>
        </div>
      </div>

      {/* Streak visualization */}
      {showStreaks && (
        <div className="streak-visualization mt-6">
          <h3 className="text-lg font-heading font-semibold text-gray-900 mb-3">Current Streaks</h3>
          <div className="streak-container flex flex-wrap gap-2">
            {(() => {
              const streaks = [];
              let currentStreak = 1;
              let currentType = chartData[0]?.result;
              
              for (let i = 1; i < chartData.length; i++) {
                // Normalize result types for streak calculation
                const normalizedResult = chartData[i].result.includes('Win') ? 'Win' : chartData[i].result;
                const normalizedCurrentType = currentType.includes('Win') ? 'Win' : currentType;
                
                if (normalizedResult === normalizedCurrentType) {
                  currentStreak++;
                } else {
                  if (currentStreak > 1) {
                    streaks.push({ type: currentType, length: currentStreak });
                  }
                  currentStreak = 1;
                  currentType = chartData[i].result;
                }
              }
              
              if (currentStreak > 1) {
                streaks.push({ type: currentType, length: currentStreak });
              }
              
              return streaks.map((streak, index) => (
                <div key={index} className={`px-3 py-1 rounded-full text-sm font-medium ${
                  streak.type.includes('Win') 
                    ? 'bg-green-100 text-green-700 border border-green-300' 
                    : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                }`}>
                  <span className="streak-type">{streak.type}</span>
                  <span className="streak-length ml-1">{streak.length} matches</span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsChart;