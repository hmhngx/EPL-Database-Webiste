import { useState, useEffect, useMemo } from 'react';
import { FaSpinner, FaCalendarAlt, FaFilter } from 'react-icons/fa';
import MatchList from '../components/MatchList';
import Filters from '../components/Filters';
import GoalsFilter from '../components/GoalsFilter';
import GoalsChart from '../components/GoalsChart';
import ResultsChart from '../components/ResultsChart';

const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [venueFilter, setVenueFilter] = useState('all');
  const [goalsSlider, setGoalsSlider] = useState(10);
  const [minGoals, setMinGoals] = useState('');
  const [maxGoals, setMaxGoals] = useState('');
  const [gameweekFilter, setGameweekFilter] = useState('all');
  const [groupBy, setGroupBy] = useState('gameweek'); // 'gameweek' or 'month'

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        const url = gameweekFilter !== 'all' 
          ? `/api/matches?gameweek=${gameweekFilter}`
          : '/api/matches';
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch matches');
        const data = await response.json();
        
        // Transform API response to match component format
        const transformedMatches = (data.data || []).map(match => ({
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
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [gameweekFilter]);

  const filteredMatches = useMemo(() => {
    let filtered = [...matches];
    
    if (searchQuery) {
      filtered = filtered.filter(match => {
        const homeTeam = match.teams.home.name.toLowerCase();
        const awayTeam = match.teams.away.name.toLowerCase();
        const query = searchQuery.toLowerCase();
        return homeTeam.includes(query) || awayTeam.includes(query);
      });
    }
    
    if (resultFilter !== 'all') {
      filtered = filtered.filter(match => {
        const homeGoals = match.goals.home;
        const awayGoals = match.goals.away;
        if (resultFilter === 'win') {
          // For league-wide, we show all wins (either team)
          return homeGoals > awayGoals || awayGoals > homeGoals;
        }
        if (resultFilter === 'loss') {
          // This doesn't make sense for league-wide, so we'll treat it as draws
          return false;
        }
        if (resultFilter === 'draw') {
          return homeGoals === awayGoals;
        }
        return true;
      });
    }
    
    if (venueFilter !== 'all') {
      // For league-wide, venue filter doesn't apply the same way
      // We'll skip this or adapt it differently
    }
    
    if (minGoals !== '') {
      filtered = filtered.filter(match => 
        (match.goals.home + match.goals.away) >= Number(minGoals)
      );
    }
    
    if (maxGoals !== '') {
      filtered = filtered.filter(match => 
        (match.goals.home + match.goals.away) <= Number(maxGoals)
      );
    }
    
    return filtered;
  }, [searchQuery, resultFilter, venueFilter, minGoals, maxGoals, matches]);

  const groupedMatches = useMemo(() => {
    if (groupBy === 'gameweek') {
      // Group by gameweek (simplified - assumes 10 matches per gameweek)
      const groups = {};
      filteredMatches.forEach((match, index) => {
        const gameweek = Math.floor(index / 10) + 1;
        if (!groups[gameweek]) groups[gameweek] = [];
        groups[gameweek].push(match);
      });
      return groups;
    } else {
      // Group by month
      const groups = {};
      filteredMatches.forEach(match => {
        const date = new Date(match.fixture.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        if (!groups[monthKey]) {
          groups[monthKey] = { label: monthLabel, matches: [] };
        }
        groups[monthKey].matches.push(match);
      });
      return groups;
    }
  }, [filteredMatches, groupBy]);

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
        <p className="font-bold">Error loading matches</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">
          Premier League Matches
        </h1>
        <p className="text-gray-600">Browse and filter all league matches</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <FaFilter className="text-primary" />
          <h2 className="text-xl font-heading font-semibold">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gameweek
            </label>
            <select
              value={gameweekFilter}
              onChange={(e) => setGameweekFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="all">All Gameweeks</option>
              {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
                <option key={gw} value={gw}>Gameweek {gw}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group By
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="gameweek">Gameweek</option>
              <option value="month">Month</option>
            </select>
          </div>
        </div>

        <Filters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          resultFilter={resultFilter}
          setResultFilter={setResultFilter}
          venueFilter={venueFilter}
          setVenueFilter={setVenueFilter}
        />
        
        <GoalsFilter
          goalsSlider={goalsSlider}
          setGoalsSlider={setGoalsSlider}
          minGoals={minGoals}
          setMinGoals={setMinGoals}
          maxGoals={maxGoals}
          setMaxGoals={setMaxGoals}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <GoalsChart matches={filteredMatches} />
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <ResultsChart matches={filteredMatches} />
        </div>
      </div>

      {/* Match List */}
      <div className="space-y-6">
        {Object.entries(groupedMatches).map(([key, group]) => (
          <div key={key} className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-heading font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <FaCalendarAlt className="text-primary" />
              <span>
                {groupBy === 'gameweek' 
                  ? `Gameweek ${key}`
                  : group.label || key
                }
              </span>
              <span className="text-sm font-normal text-gray-500">
                ({groupBy === 'gameweek' ? group.length : group.matches?.length || 0} matches)
              </span>
            </h2>
            <MatchList 
              matches={groupBy === 'gameweek' ? group : group.matches || []} 
            />
          </div>
        ))}
      </div>

      {filteredMatches.length === 0 && (
        <div className="bg-gray-100 rounded-xl p-8 text-center">
          <p className="text-gray-600 text-lg">No matches found matching your filters.</p>
        </div>
      )}
    </div>
  );
};

export default Matches;
