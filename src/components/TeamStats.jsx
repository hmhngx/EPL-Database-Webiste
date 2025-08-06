import React, { useEffect, useState } from 'react';
import { FaChartLine, FaThumbsUp, FaThumbsDown, FaSpinner, FaHandshake, FaTrophy, FaTimes,} from 'react-icons/fa';
import "../styles/TeamStats.css";

const TeamStats = ({ teamId = 33, season = 2023, league = 39 }) => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const apiKey = import.meta.env.VITE_FOOTBALL_API_KEY;
        if (!apiKey) throw new Error('API key is missing. Please check your .env file.');

        const res = await fetch(
          `https://v3.football.api-sports.io/teams/statistics?team=${teamId}&season=${season}&league=${league}`,
          { headers: { 'x-apisports-key': apiKey } }
        );

        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const data = await res.json();
        if (!data.response) throw new Error('No statistics data returned');

        setStats(data.response);
      } catch (err) {
        setError(`Failed to fetch stats: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [teamId, season, league]);

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

  if (loading) {
    return (
      <div className="stats-loading">
        <FaSpinner className="loading-icon" /> Loading team stats...
      </div>
    );
  }

  if (error) return <p className="error">{error}</p>;
  if (!stats || !stats.fixtures || !stats.form) {
    return <p className="error">Invalid statistics data</p>;
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