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

function App() {
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
        const apiKey = import.meta.env.VITE_FOOTBALL_API_KEY;
        if (!apiKey) throw new Error('API key is missing. Please check your .env file.');
  
        const response = await fetch(
          `https://v3.football.api-sports.io/fixtures?team=33&season=2023&league=39`,
          { headers: { 'x-apisports-key': apiKey } }
        );
  
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        if (data.response && Array.isArray(data.response)) {
          console.log(
            'Matches:',
            data.response.map(match => ({
              id: match.fixture.id,
              teams: `${match.teams.home.name} vs ${match.teams.away.name}`,
              date: match.fixture.date,
            }))
          );
          setMatches(data.response);
        } else {
          throw new Error('Invalid API response structure');
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
  
    fetchAllMatches();
  }, []);

  const filteredMatches = useMemo(() => {
    let filtered = [...matches];
    if (searchQuery) {
      filtered = filtered.filter(match => {
        const opponent = match.teams.home.id === 33 ? match.teams.away.name : match.teams.home.name;
        return opponent.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }
    if (resultFilter !== 'all') {
      filtered = filtered.filter(match => {
        const isHome = match.teams.home.id === 33;
        const homeGoals = match.goals.home;
        const awayGoals = match.goals.away;
        if (resultFilter === 'win') return isHome ? homeGoals > awayGoals : awayGoals > homeGoals;
        if (resultFilter === 'loss') return isHome ? homeGoals < awayGoals : awayGoals < homeGoals;
        if (resultFilter === 'draw') return homeGoals === awayGoals;
        return true;
      });
    }
    if (venueFilter !== 'all') {
      filtered = filtered.filter(match =>
        venueFilter === 'home' ? match.teams.home.id === 33 : match.teams.away.id === 33
      );
    }
    if (minGoals !== '') {
      filtered = filtered.filter(match => (match.goals.home + match.goals.away) >= Number(minGoals));
    }
    if (maxGoals !== '') {
      filtered = filtered.filter(match => (match.goals.home + match.goals.away) <= Number(maxGoals));
    }
    return filtered;
  }, [searchQuery, resultFilter, venueFilter, minGoals, maxGoals, matches]);

  const totalMatches = matches.length;
  const wins = matches.filter(match => {
    const isHome = match.teams.home.id === 33;
    const homeGoals = match.goals.home;
    const awayGoals = match.goals.away;
    return isHome ? homeGoals > awayGoals : awayGoals > homeGoals;
  }).length;

  if (loading) {
    return <div className="loading">Loading matches...</div>;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <div className="dashboard">
        <div className="header">
          <img src="/mulogo.png" alt="Manchester United Logo" className="club-logo" />
            <h1>Manchester United 2023/2024 Season Dashboard</h1>
        </div>
          {error && <p className="error">Error: {error}</p>}
          <TeamStats />
          <StatsSummary totalMatches={totalMatches} wins={wins} />
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
          {/* Data Insights Section */}
          <div className="data-insights">
            <h2>Data Insights</h2>
            <p>
              Explore Manchester United's 2023/2024 season performance in the Premier League. Use the filters to analyze specific match outcomes:
              - Filter by "Wins" to see United's best performances.
              - Set a "Min Goals" of 3 to focus on high-scoring games.
              - Toggle the charts below to compare goals scored and match results over the season.
            </p>
          </div>
          {/* Chart Toggles */}
          <div className="chart-toggles">
            <label>
              <input
                type="checkbox"
                checked={showGoalsChart}
                onChange={() => setShowGoalsChart(!showGoalsChart)}
              />
              Show Goals Chart
            </label>
            <label>
              <input
                type="checkbox"
                checked={showResultsChart}
                onChange={() => setShowResultsChart(!showResultsChart)}
              />
              Show Results Chart
            </label>
          </div>
          {/* Charts */}
          {showGoalsChart && <GoalsChart matches={filteredMatches} />}
          {showResultsChart && <ResultsChart matches={filteredMatches} />}
          <MatchList matches={filteredMatches} />
        </div>
      </div>
    </div>
  );
}

export default App;