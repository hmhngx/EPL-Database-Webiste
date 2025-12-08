import React, { useMemo } from 'react';
import { FaChartLine, FaThumbsUp, FaThumbsDown, FaHandshake, FaTrophy, FaTimes } from 'react-icons/fa';
import "../styles/TeamStats.css";

const TeamStats = ({ teamId, matches = [] }) => {
  // Calculate stats from matches data
  const stats = useMemo(() => {
    if (!teamId || !matches || matches.length === 0) {
      return null;
    }

    const teamMatches = matches.filter(match => 
      match.teams.home.id === teamId || match.teams.away.id === teamId
    );

    if (teamMatches.length === 0) {
      return null;
    }

    let wins = 0;
    let losses = 0;
    let draws = 0;
    const form = [];

    // Process matches in chronological order (oldest first)
    const sortedMatches = [...teamMatches].sort((a, b) => 
      new Date(a.fixture.date) - new Date(b.fixture.date)
    );

    sortedMatches.forEach(match => {
      const isHome = match.teams.home.id === teamId;
      const homeGoals = match.goals.home;
      const awayGoals = match.goals.away;

      if (homeGoals > awayGoals) {
        if (isHome) {
          wins++;
          form.push('W');
        } else {
          losses++;
          form.push('L');
        }
      } else if (awayGoals > homeGoals) {
        if (isHome) {
          losses++;
          form.push('L');
        } else {
          wins++;
          form.push('W');
        }
      } else {
        draws++;
        form.push('D');
      }
    });

    // Get last 5 matches for recent form
    const recentForm = form.slice(-5).join('');

    return {
      fixtures: {
        wins: { total: wins },
        loses: { total: losses },
        draws: { total: draws },
      },
      form: recentForm,
    };
  }, [teamId, matches]);

  // Function to render form results with proper styling
  const renderFormResults = (formString) => {
    if (!formString) return <span className="no-form">No form data available</span>;
    
    return formString.split('').map((result, index) => {
      let icon, className, label;
      
      switch (result) {
        case 'W':
          icon = <FaTrophy />;
          className = 'form-win';
          label = 'Win';
          break;
        case 'L':
          icon = <FaTimes />;
          className = 'form-loss';
          label = 'Loss';
          break;
        case 'D':
          icon = <FaHandshake />;
          className = 'form-draw';
          label = 'Draw';
          break;
        default:
          icon = <FaChartLine />;
          className = 'form-unknown';
          label = result;
      }
      
      return (
        <div key={index} className={`form-result ${className}`} title={label}>
          <div className="form-icon">{icon}</div>
          <div className="form-letter">{result}</div>
        </div>
      );
    });
  };

  if (!teamId) {
    return null; // Don't show team stats if no team is selected
  }

  if (!stats || !stats.fixtures) {
    return (
      <div className="bg-gray-100 rounded-xl p-6 text-center">
        <p className="text-gray-600">No statistics available for this team.</p>
      </div>
    );
  }

  return (
    <div className="team-stats">
      <h2 className="stats-title">Season Statistics</h2>
      <div className="stats-grid">
        <div className="stat-item win">
          <FaThumbsUp className="stat-icon" />
          <h3>Wins</h3>
          <p>{stats.fixtures.wins.total}</p>
        </div>
        <div className="stat-item loss">
          <FaThumbsDown className="stat-icon" />
          <h3>Losses</h3>
          <p>{stats.fixtures.loses.total}</p>
        </div>
        <div className="stat-item draw">
          <FaHandshake className="stat-icon" />
          <h3>Draws</h3>
          <p>{stats.fixtures.draws.total}</p>
        </div>
        <div className="stat-item form-section">
          <FaChartLine className="stat-icon" />
          <h3>Recent Form</h3>
          <div className="form-display">
            {renderFormResults(stats.form)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamStats;