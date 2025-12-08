import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaSpinner, FaBuilding, FaCalendarAlt, FaUsers, FaMapMarkerAlt, FaTrophy, FaArrowLeft } from 'react-icons/fa';
import MatchList from '../components/MatchList';
import ClubStats from '../components/ClubStats';
import GoalsChart from '../components/GoalsChart';
import ResultsChart from '../components/ResultsChart';

const ClubDetail = () => {
  const { id } = useParams();
  const [club, setClub] = useState(null);
  const [squad, setSquad] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGoalsChart, setShowGoalsChart] = useState(true);
  const [showResultsChart, setShowResultsChart] = useState(true);

  useEffect(() => {
    const fetchClubData = async () => {
      try {
        setLoading(true);
        
        // Fetch club details
        const clubResponse = await fetch(`/api/clubs/${id}`);
        if (!clubResponse.ok) throw new Error('Failed to fetch club details');
        const clubData = await clubResponse.json();
        setClub(clubData.data);

        // Fetch squad
        const squadResponse = await fetch(`/api/clubs/${id}/squad`);
        if (squadResponse.ok) {
          const squadData = await squadResponse.json();
          setSquad(squadData.data || []);
        }

        // Fetch club matches
        const matchesResponse = await fetch('/api/matches');
        if (matchesResponse.ok) {
          const matchesData = await matchesResponse.json();
          // Filter matches for this club
          const clubMatches = (matchesData.data || []).filter(match => 
            match.home_club_id === id || match.away_club_id === id
          );
          
          // Transform to MatchList format
          const transformedMatches = clubMatches.map(match => ({
            fixture: {
              id: match.match_id,
              date: match.date,
            },
            teams: {
              home: {
                id: match.home_club_id,
                name: match.home_club,
              },
              away: {
                id: match.away_club_id,
                name: match.away_club,
              },
            },
            goals: {
              home: match.home_goals,
              away: match.away_goals,
            },
          }));
          
          setMatches(transformedMatches);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchClubData();
    }
  }, [id]);

  const getPositionAbbreviation = (position) => {
    const abbrev = {
      'Goalkeeper': 'GK',
      'Defender': 'DEF',
      'Midfielder': 'MID',
      'Forward': 'FWD'
    };
    return abbrev[position] || position;
  };

  const getPositionColor = (position) => {
    const colors = {
      'Goalkeeper': 'bg-yellow-100 text-yellow-800',
      'Defender': 'bg-blue-100 text-blue-800',
      'Midfielder': 'bg-green-100 text-green-800',
      'Forward': 'bg-red-100 text-red-800'
    };
    return colors[position] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <FaSpinner className="animate-spin text-4xl text-primary" />
      </div>
    );
  }

  if (error || !club) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">Error loading club</p>
        <p>{error || 'Club not found'}</p>
        <Link to="/clubs" className="text-primary hover:underline mt-2 inline-block">
          ← Back to Clubs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Link
          to="/clubs"
          className="text-primary hover:text-accent transition-colors"
        >
          <FaArrowLeft className="text-2xl" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-heading font-bold text-gray-900">
            {club.name}
          </h1>
        </div>
      </div>

      {/* Club Info Card */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-4">
            {club.logo_url ? (
              <img
                src={club.logo_url}
                alt={club.name}
                className="w-20 h-20 object-contain"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                <FaBuilding className="text-3xl text-gray-400" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-heading font-bold text-gray-900">{club.name}</h2>
              {club.founded && (
                <p className="text-gray-600 flex items-center space-x-2">
                  <FaCalendarAlt />
                  <span>Founded {club.founded}</span>
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
              <FaMapMarkerAlt className="text-primary" />
              <span>Stadium</span>
            </h3>
            <p className="text-gray-700">{club.stadium_name}</p>
            <p className="text-gray-600 text-sm">{club.stadium_city}</p>
            {club.stadium_capacity && (
              <p className="text-gray-600 text-sm">
                Capacity: {club.stadium_capacity.toLocaleString()}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
              <FaUsers className="text-primary" />
              <span>Statistics</span>
            </h3>
            <p className="text-gray-700">Players: {club.player_count || 0}</p>
            <p className="text-gray-700">Matches: {club.match_count || 0}</p>
          </div>
        </div>
      </div>

      {/* Club Stats */}
      <ClubStats clubId={id} />

      {/* Charts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-heading font-bold text-gray-900">Performance Charts</h2>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showGoalsChart}
                onChange={() => setShowGoalsChart(!showGoalsChart)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Goals Chart</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showResultsChart}
                onChange={() => setShowResultsChart(!showResultsChart)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Results Chart</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {showGoalsChart && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <GoalsChart matches={matches} />
            </div>
          )}
          {showResultsChart && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <ResultsChart matches={matches} />
            </div>
          )}
        </div>
      </div>

      {/* Squad Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-heading font-bold text-gray-900">Squad</h2>
          <p className="text-gray-600 text-sm mt-1">{squad.length} players</p>
        </div>
        
        {squad.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-primary text-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-heading font-semibold uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-heading font-semibold uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-heading font-semibold uppercase tracking-wider">
                    Nationality
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-heading font-semibold uppercase tracking-wider">
                    Age
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {squad.map((player) => (
                  <tr key={player.player_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {player.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPositionColor(player.position)}`}>
                        {getPositionAbbreviation(player.position)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {player.nationality || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {player.age || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            No squad data available
          </div>
        )}
      </div>

      {/* Club Matches */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-heading font-bold text-gray-900 mb-4">Recent Matches</h2>
        {matches.length > 0 ? (
          <MatchList matches={matches} />
        ) : (
          <p className="text-gray-500 text-center py-8">No matches found for this club</p>
        )}
      </div>
    </div>
  );
};

export default ClubDetail;
