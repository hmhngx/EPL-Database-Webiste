import { useState, useEffect } from 'react';
import { FaSort, FaSortUp, FaSortDown, FaSpinner } from 'react-icons/fa';
import ResultsChart from '../components/ResultsChart';
import GoalDifferenceChart from '../components/GoalDifferenceChart';

const Standings = () => {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'pts', direction: 'desc' });
  const [showGDChart, setShowGDChart] = useState(true);
  const [showResultsChart, setShowResultsChart] = useState(true);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/standings');
        if (!response.ok) throw new Error('Failed to fetch standings');
        const data = await response.json();
        setStandings(data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, []);

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    } else if (sortConfig.key === key && sortConfig.direction === 'asc') {
      // If clicking the same column again, sort alphabetically by club name
      setSortConfig({ key: 'club', direction: 'asc' });
      return;
    }
    setSortConfig({ key, direction });
  };

  const sortedStandings = [...standings].sort((a, b) => {
    if (sortConfig.key === 'club') {
      return sortConfig.direction === 'asc'
        ? a.club.localeCompare(b.club)
        : b.club.localeCompare(a.club);
    }
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (sortConfig.direction === 'asc') {
      return aVal - bVal;
    }
    return bVal - aVal;
  });

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <FaSort className="inline ml-1 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? (
      <FaSortUp className="inline ml-1 text-accent" />
    ) : (
      <FaSortDown className="inline ml-1 text-accent" />
    );
  };

  const getRowClass = (index) => {
    if (index < 4) return 'bg-green-50 border-l-4 border-green-500';
    if (index >= sortedStandings.length - 3) return 'bg-red-50 border-l-4 border-red-500';
    return 'bg-white even:bg-gray-50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <FaSpinner className="animate-spin text-4xl text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">Error loading standings</p>
        <p>{error}</p>
      </div>
    );
  }

  // Convert standings to match format for ResultsChart
  // This is a simplified conversion - you may need to adjust based on your data structure
  const matchesForChart = sortedStandings.flatMap((team, index) => {
    // Create mock match data from standings stats
    // In a real scenario, you'd fetch actual match data
    return [];
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">
          Premier League Standings
        </h1>
        <p className="text-gray-600">Current league table with sorting options</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-primary text-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-heading font-semibold uppercase tracking-wider">
                  Pos
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-heading font-semibold uppercase tracking-wider cursor-pointer hover:bg-primary/80"
                  onClick={() => handleSort('club')}
                >
                  Club {getSortIcon('club')}
                </th>
                <th
                  className="px-6 py-3 text-center text-xs font-heading font-semibold uppercase tracking-wider cursor-pointer hover:bg-primary/80"
                  onClick={() => handleSort('mp')}
                >
                  MP {getSortIcon('mp')}
                </th>
                <th
                  className="px-6 py-3 text-center text-xs font-heading font-semibold uppercase tracking-wider cursor-pointer hover:bg-primary/80"
                  onClick={() => handleSort('w')}
                >
                  W {getSortIcon('w')}
                </th>
                <th
                  className="px-6 py-3 text-center text-xs font-heading font-semibold uppercase tracking-wider cursor-pointer hover:bg-primary/80"
                  onClick={() => handleSort('d')}
                >
                  D {getSortIcon('d')}
                </th>
                <th
                  className="px-6 py-3 text-center text-xs font-heading font-semibold uppercase tracking-wider cursor-pointer hover:bg-primary/80"
                  onClick={() => handleSort('l')}
                >
                  L {getSortIcon('l')}
                </th>
                <th
                  className="px-6 py-3 text-center text-xs font-heading font-semibold uppercase tracking-wider cursor-pointer hover:bg-primary/80"
                  onClick={() => handleSort('gf')}
                >
                  GF {getSortIcon('gf')}
                </th>
                <th
                  className="px-6 py-3 text-center text-xs font-heading font-semibold uppercase tracking-wider cursor-pointer hover:bg-primary/80"
                  onClick={() => handleSort('ga')}
                >
                  GA {getSortIcon('ga')}
                </th>
                <th
                  className="px-6 py-3 text-center text-xs font-heading font-semibold uppercase tracking-wider cursor-pointer hover:bg-primary/80"
                  onClick={() => handleSort('gd')}
                >
                  GD {getSortIcon('gd')}
                </th>
                <th
                  className="px-6 py-3 text-center text-xs font-heading font-semibold uppercase tracking-wider cursor-pointer hover:bg-primary/80"
                  onClick={() => handleSort('pts')}
                >
                  Pts {getSortIcon('pts')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedStandings.map((team, index) => {
                // Calculate position based on sort - if sorting by points/gd, use index+1, otherwise show original position
                const position = sortConfig.key === 'pts' || sortConfig.key === 'gd' 
                  ? index + 1 
                  : index + 1;
                
                return (
                  <tr key={team.club_id} className={getRowClass(index)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {position}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {team.club}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                      {team.mp}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                      {team.w}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                      {team.d}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                      {team.l}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                      {team.gf}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                      {team.ga}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                      {team.gd > 0 ? '+' : ''}{team.gd}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary text-center">
                      {team.pts}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-heading font-bold text-gray-900">Visualizations</h2>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showGDChart}
                onChange={() => setShowGDChart(!showGDChart)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Goal Difference Chart</span>
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
          {showGDChart && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <GoalDifferenceChart standings={sortedStandings} />
            </div>
          )}
          
          {showResultsChart && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-heading font-bold text-gray-900 mb-4">
                League Results Overview
              </h3>
              <p className="text-gray-600 mb-4 text-sm">
                Visual representation of league-wide match results. Note: This chart requires match data to be fully functional.
              </p>
              <div className="text-center text-gray-500 py-8">
                Chart integration pending match data availability
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Standings;
