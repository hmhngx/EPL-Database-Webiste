import React, { useState, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FaTrophy, FaTimes, FaHandshake, FaEye, FaEyeSlash } from 'react-icons/fa';
import '../styles/ResultsChart.css';

const ResultsChart = ({ matches }) => {
  const [showWins, setShowWins] = useState(true);
  const [showLosses, setShowLosses] = useState(true);
  const [showDraws, setShowDraws] = useState(true);
  const [showStreaks, setShowStreaks] = useState(true);

  const chartData = useMemo(() => {
    return matches.map((match, index) => {
    const isHome = match.teams.home.id === 33;
    const homeGoals = match.goals.home;
    const awayGoals = match.goals.away;
      
      let result, resultValue, color, icon;
      if ((isHome && homeGoals > awayGoals) || (!isHome && awayGoals > homeGoals)) {
        result = 'Win';
        resultValue = 3;
        color = '#4CAF50';
        icon = <FaTrophy />;
      } else if ((isHome && homeGoals < awayGoals) || (!isHome && awayGoals < homeGoals)) {
        result = 'Loss';
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
        isHome,
        homeTeam: match.teams.home.name,
        awayTeam: match.teams.away.name,
        homeGoals,
        awayGoals,
        opponent: isHome ? match.teams.away.name : match.teams.home.name,
        score: `${homeGoals}-${awayGoals}`,
        venue: isHome ? 'Home' : 'Away'
      };
    });
  }, [matches]);

  // Calculate streaks
  const dataWithStreaks = useMemo(() => {
    if (!showStreaks) return chartData;

    return chartData.map((item, index) => {
      let currentStreak = 1;
      let streakType = item.result;
      
      // Look backwards for streak
      for (let i = index - 1; i >= 0; i--) {
        if (chartData[i].result === item.result) {
          currentStreak++;
        } else {
          break;
        }
      }

      return {
        ...item,
        currentStreak,
        streakType,
        isStreakStart: index === 0 || chartData[index - 1]?.result !== item.result
      };
    });
  }, [chartData, showStreaks]);

  // Calculate statistics
  const stats = useMemo(() => {
    const wins = chartData.filter(item => item.result === 'Win').length;
    const losses = chartData.filter(item => item.result === 'Loss').length;
    const draws = chartData.filter(item => item.result === 'Draw').length;
    const total = chartData.length;

    return {
      wins,
      losses,
      draws,
      total,
      winRate: ((wins / total) * 100).toFixed(1),
      points: wins * 3 + draws
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
          <p className="tooltip-opponent">vs {data.opponent} ({data.venue})</p>
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
    if (payload.result === 'Win' && !showWins) opacity = 0.3;
    if (payload.result === 'Loss' && !showLosses) opacity = 0.3;
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
          {payload.result === 'Win' ? 'W' : payload.result === 'Loss' ? 'L' : 'D'}
        </text>
      </g>
    );
  };

  // Debug: Log the data to see what's being passed
  console.log('Chart Data:', dataWithStreaks);
  console.log('Matches count:', matches.length);
  console.log('Chart data count:', dataWithStreaks.length);

  return (
    <div className="chart-section">
      <div className="chart-header">
      <h2>Match Results Over Time</h2>
        <div className="chart-controls">
          <div className="control-group">
            <button 
              className={`toggle-btn ${showWins ? 'active' : ''}`}
              onClick={() => setShowWins(!showWins)}
              style={{borderColor: showWins ? '#4CAF50' : undefined}}
            >
              <FaTrophy />
              <span>Wins ({stats.wins})</span>
            </button>
            
            <button 
              className={`toggle-btn ${showLosses ? 'active' : ''}`}
              onClick={() => setShowLosses(!showLosses)}
              style={{borderColor: showLosses ? '#F44336' : undefined}}
            >
              <FaTimes />
              <span>Losses ({stats.losses})</span>
            </button>
            
            <button 
              className={`toggle-btn ${showDraws ? 'active' : ''}`}
              onClick={() => setShowDraws(!showDraws)}
              style={{borderColor: showDraws ? '#FFC107' : undefined}}
            >
              <FaHandshake />
              <span>Draws ({stats.draws})</span>
            </button>
          </div>
          
          <div className="control-group">
            <button 
              className={`toggle-btn ${showStreaks ? 'active' : ''}`}
              onClick={() => setShowStreaks(!showStreaks)}
              title="Toggle Streak Visualization"
            >
              {showStreaks ? <FaEye /> : <FaEyeSlash />}
              <span>Streaks</span>
            </button>
          </div>
        </div>
      </div>

      <div className="stats-summary">
        <div className="stat-card">
          <span className="stat-label">Win Rate</span>
          <span className="stat-value">{stats.winRate}%</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Points</span>
          <span className="stat-value">{stats.points}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Matches</span>
          <span className="stat-value">{stats.total}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart data={dataWithStreaks}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis 
            dataKey="matchNumber" 
            type="number"
            tick={{ fill: '#fff', fontSize: 10 }}
            label={{ value: 'Match Number', position: 'insideBottom', offset: -15, fill: '#fff', fontSize: 14 }}
            domain={[0, 'dataMax + 1']}
            tickMargin={8}
            interval="preserveStartEnd"
          />
          <YAxis 
            type="number"
            tick={{ fill: '#fff', fontSize: 12 }}
            domain={[0.5, 3.5]}
            tickFormatter={(value) => {
              if (value === 1) return 'Loss';
              if (value === 2) return 'Draw';
              if (value === 3) return 'Win';
              return '';
            }}
            label={{ value: 'Result', angle: -90, position: 'insideLeft', fill: '#fff', fontSize: 14 }}
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
      <div className="chart-legend">
        <div className="legend-item">
          <div className={`legend-dot win ${showWins ? 'active' : 'inactive'}`}></div>
          <span>Wins {showWins ? '(Highlighted)' : '(Dimmed)'}</span>
        </div>
        <div className="legend-item">
          <div className={`legend-dot draw ${showDraws ? 'active' : 'inactive'}`}></div>
          <span>Draws {showDraws ? '(Highlighted)' : '(Dimmed)'}</span>
        </div>
        <div className="legend-item">
          <div className={`legend-dot loss ${showLosses ? 'active' : 'inactive'}`}></div>
          <span>Losses {showLosses ? '(Highlighted)' : '(Dimmed)'}</span>
        </div>
      </div>

      {/* Streak visualization */}
      {showStreaks && (
        <div className="streak-visualization">
          <h3>Current Streaks</h3>
          <div className="streak-container">
            {(() => {
              const streaks = [];
              let currentStreak = 1;
              let currentType = chartData[0]?.result;
              
              for (let i = 1; i < chartData.length; i++) {
                if (chartData[i].result === currentType) {
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
                <div key={index} className={`streak-item ${streak.type.toLowerCase()}`}>
                  <span className="streak-type">{streak.type}</span>
                  <span className="streak-length">{streak.length} matches</span>
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