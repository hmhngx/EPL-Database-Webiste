import { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import StatsSummary from './components/StatsSummary';
import Filters from './components/Filters';
import GoalsFilter from './components/GoalsFilter';
import GoalsChart from './components/GoalsChart';
import MatchList from './components/MatchList';
import TeamStats from './components/TeamStats';
import ResultsChart from './components/ResultsChart'; 
import './styles/App.css';

function App({ teamId = null }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [venueFilter, setVenueFilter] = useState('all');
  const [goalsSlider, setGoalsSlider] = useState(10);
  const [minGoals, setMinGoals] = useState('');
  const [maxGoals, setMaxGoals] = useState('');
  const [error, setError] = useState(null);
  const [showGoalsChart, setShowGoalsChart] = useState(true); 
  const [showResultsChart, setShowResultsChart] = useState(true); 

  useEffect(() => {
    const fetchAllMatches = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use internal API instead of api-sports.io
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        let url = `${apiBaseUrl}/api/matches`;
        
        // If teamId is provided, filter by team (would need backend support)
        // For now, fetch all matches and filter client-side if needed
        const response = await fetch(url);
  
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
          // Transform API response to match component format
          const transformedMatches = data.data.map(match => ({
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
        } else {
          throw new Error('Invalid API response structure');
        }
      } catch (error) {
        setError(error.message);
        console.error('Error fetching matches:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchAllMatches();
  }, [teamId]);

  const filteredMatches = useMemo(() => {
    let filtered = [...matches];
    
    // Filter by team if teamId is provided
    if (teamId) {
      filtered = filtered.filter(match => 
        match.teams.home.id === teamId || match.teams.away.id === teamId
      );
    }
    
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
        
        if (teamId) {
          // For specific team: determine win/loss/draw from team's perspective
          const isHome = match.teams.home.id === teamId;
          if (resultFilter === 'win') {
            return isHome ? homeGoals > awayGoals : awayGoals > homeGoals;
          }
          if (resultFilter === 'loss') {
            return isHome ? homeGoals < awayGoals : awayGoals < homeGoals;
          }
          if (resultFilter === 'draw') {
            return homeGoals === awayGoals;
          }
        } else {
          // For league-wide: show all matches of that result type
          if (resultFilter === 'win') {
            return homeGoals !== awayGoals; // Any win (home or away)
          }
          if (resultFilter === 'loss') {
            return false; // Loss doesn't make sense league-wide
          }
          if (resultFilter === 'draw') {
            return homeGoals === awayGoals;
          }
        }
        return true;
      });
    }
    
    if (venueFilter !== 'all' && teamId) {
      // Venue filter only makes sense when filtering by a specific team
      filtered = filtered.filter(match =>
        venueFilter === 'home' 
          ? match.teams.home.id === teamId 
          : match.teams.away.id === teamId
      );
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
  }, [searchQuery, resultFilter, venueFilter, minGoals, maxGoals, matches, teamId]);

  // Calculate stats for the filtered matches
  const stats = useMemo(() => {
    if (teamId) {
      // Calculate stats from team's perspective
      const wins = filteredMatches.filter(match => {
        const isHome = match.teams.home.id === teamId;
        const homeGoals = match.goals.home;
        const awayGoals = match.goals.away;
        return isHome ? homeGoals > awayGoals : awayGoals > homeGoals;
      }).length;
      
      return {
        totalMatches: filteredMatches.length,
        wins,
      };
    } else {
      // League-wide stats
      const wins = filteredMatches.filter(match => 
        match.goals.home !== match.goals.away
      ).length;
      
      return {
        totalMatches: filteredMatches.length,
        wins,
      };
    }
  }, [filteredMatches, teamId]);

  const { totalMatches, wins } = stats;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <div className="dashboard">
          <div className="header">
            {teamId ? (
              <>
                <h1 className="text-3xl font-heading font-bold text-gray-900">
                  Team Dashboard
                </h1>
              </>
            ) : (
              <h1 className="text-3xl font-heading font-bold text-gray-900">
                Premier League 2023/2024 Season Dashboard
              </h1>
            )}
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          )}
          
          {teamId && <TeamStats teamId={teamId} matches={matches} />}
          
          <StatsSummary totalMatches={totalMatches} wins={wins} />
          
          <Filters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            resultFilter={resultFilter}
            setResultFilter={setResultFilter}
            venueFilter={venueFilter}
            setVenueFilter={setVenueFilter}
            teamId={teamId}
          />
          
          <GoalsFilter
            goalsSlider={goalsSlider}
            setGoalsSlider={setGoalsSlider}
            minGoals={minGoals}
            setMinGoals={setMinGoals}
            maxGoals={maxGoals}
            setMaxGoals={setMaxGoals}
          />
          
          {/* Data Insights Section */}
          <div className="data-insights bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-heading font-bold text-gray-900 mb-3">
              Data Insights
            </h2>
            <p className="text-gray-600">
              {teamId 
                ? "Explore team performance in the Premier League. Use the filters to analyze specific match outcomes."
                : "Explore the Premier League 2023/2024 season. Use the filters to analyze specific match outcomes, team performances, and goal statistics."
              }
            </p>
            <ul className="list-disc list-inside mt-3 text-gray-600 space-y-1">
              <li>Filter by result type to see wins, losses, or draws</li>
              <li>Set goal filters to focus on high-scoring or low-scoring games</li>
              <li>Toggle the charts below to compare goals scored and match results</li>
            </ul>
          </div>
          
          {/* Chart Toggles */}
          <div className="chart-toggles bg-white rounded-xl shadow-lg p-4 mb-6 flex flex-wrap gap-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showGoalsChart}
                onChange={() => setShowGoalsChart(!showGoalsChart)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="text-gray-700">Show Goals Chart</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showResultsChart}
                onChange={() => setShowResultsChart(!showResultsChart)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="text-gray-700">Show Results Chart</span>
            </label>
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {showGoalsChart && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <GoalsChart matches={filteredMatches} />
              </div>
            )}
            {showResultsChart && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <ResultsChart matches={filteredMatches} />
              </div>
            )}
          </div>
          
          <MatchList matches={filteredMatches} />
        </div>
      </div>
    </div>
  );
}

export default App;