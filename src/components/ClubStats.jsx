import React, { useEffect, useState } from 'react';
import { FaChartLine, FaThumbsUp, FaThumbsDown, FaSpinner, FaHandshake, FaTrophy, FaTimes } from 'react-icons/fa';

const ClubStats = ({ clubId }) => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch club matches to calculate stats
        const matchesResponse = await fetch('/api/matches');
        if (!matchesResponse.ok) throw new Error('Failed to fetch matches');
        const matchesData = await matchesResponse.json();
        
        // Filter matches for this club
        const clubMatches = (matchesData.data || []).filter(match => 
          match.home_club_id === clubId || match.away_club_id === clubId
        );

        // Calculate stats from matches
        let wins = 0;
        let draws = 0;
        let losses = 0;
        const recentForm = [];

        clubMatches.forEach(match => {
          const isHome = match.home_club_id === clubId;
          const homeGoals = match.home_goals;
          const awayGoals = match.away_goals;

          if (isHome) {
            if (homeGoals > awayGoals) {
              wins++;
              recentForm.push('W');
            } else if (homeGoals < awayGoals) {
              losses++;
              recentForm.push('L');
            } else {
              draws++;
              recentForm.push('D');
            }
          } else {
            if (awayGoals > homeGoals) {
              wins++;
              recentForm.push('W');
            } else if (awayGoals < homeGoals) {
              losses++;
              recentForm.push('L');
            } else {
              draws++;
              recentForm.push('D');
            }
          }
        });

        // Get last 5 matches for form
        const form = recentForm.slice(-5).join('');

        setStats({
          fixtures: {
            wins: { total: wins },
            draws: { total: draws },
            loses: { total: losses }
          },
          form: form
        });
      } catch (err) {
        setError(`Failed to fetch stats: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (clubId) {
      fetchStats();
    }
  }, [clubId]);

  // Function to render form results with proper styling
  const renderFormResults = (formString) => {
    if (!formString) return <span className="text-gray-400">No form data available</span>;
    
    return formString.split('').map((result, index) => {
      let icon, className, label;
      
      switch (result) {
        case 'W':
          icon = <FaTrophy />;
          className = 'text-green-600 bg-green-100';
          label = 'Win';
          break;
        case 'L':
          icon = <FaTimes />;
          className = 'text-red-600 bg-red-100';
          label = 'Loss';
          break;
        case 'D':
          icon = <FaHandshake />;
          className = 'text-yellow-600 bg-yellow-100';
          label = 'Draw';
          break;
        default:
          icon = <FaChartLine />;
          className = 'text-gray-600 bg-gray-100';
          label = result;
      }
      
      return (
        <div
          key={index}
          className={`w-10 h-10 rounded-full flex items-center justify-center ${className}`}
          title={label}
        >
          {icon}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center py-8">
          <FaSpinner className="animate-spin text-2xl text-primary" />
          <span className="ml-3 text-gray-600">Loading club stats...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <p className="text-gray-600">No statistics available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-heading font-bold text-gray-900 mb-6">Season Statistics</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center space-x-3">
            <FaThumbsUp className="text-green-600 text-2xl" />
            <div>
              <h3 className="text-sm font-medium text-gray-600">Wins</h3>
              <p className="text-2xl font-bold text-green-700">{stats.fixtures.wins.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center space-x-3">
            <FaThumbsDown className="text-red-600 text-2xl" />
            <div>
              <h3 className="text-sm font-medium text-gray-600">Losses</h3>
              <p className="text-2xl font-bold text-red-700">{stats.fixtures.loses.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center space-x-3">
            <FaHandshake className="text-yellow-600 text-2xl" />
            <div>
              <h3 className="text-sm font-medium text-gray-600">Draws</h3>
              <p className="text-2xl font-bold text-yellow-700">{stats.fixtures.draws.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <FaChartLine className="text-primary text-xl" />
              <h3 className="text-sm font-medium text-gray-700">Recent Form</h3>
            </div>
            <div className="flex space-x-2">
              {renderFormResults(stats.form)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubStats;
