import { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaSort, FaSortUp, FaSortDown, FaSpinner, FaChartLine, FaTrophy, FaEye, FaEyeSlash } from 'react-icons/fa';
import ResultsChart from '../components/ResultsChart';
import GoalDifferenceChart from '../components/GoalDifferenceChart';
import StatsSummary from '../components/StatsSummary';
import ChartFilters from '../components/ChartFilters';
import CumulativePointsChart from '../components/CumulativePointsChart';
import AttackDefenseChart from '../components/AttackDefenseChart';

const Standings = () => {
  const [standings, setStandings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'pts', direction: 'desc' });
  const [showGDChart, setShowGDChart] = useState(true);
  const [showResultsChart, setShowResultsChart] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [expandedSections, setExpandedSections] = useState({
    stats: true,
    insights: true,
    charts: true,
  });

  // Chart filter states
  const [venue, setVenue] = useState('all');
  const [gameweekRange, setGameweekRange] = useState([1, 38]);
  const [selectedTeams, setSelectedTeams] = useState([]);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch standings
        const standingsResponse = await fetch('/api/standings');
        if (!standingsResponse.ok) {
          throw new Error(`Failed to fetch standings: ${standingsResponse.status} ${standingsResponse.statusText}`);
        }
        const standingsData = await standingsResponse.json();
        
        // Fetch all matches
        const matchesResponse = await fetch('/api/matches');
        if (!matchesResponse.ok) {
          throw new Error(`Failed to fetch matches: ${matchesResponse.status} ${matchesResponse.statusText}`);
        }
        const matchesData = await matchesResponse.json();
        
        if (isMounted) {
          setStandings(standingsData.data || []);
          setMatches(matchesData.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'An error occurred while fetching data');
        }
        console.error('Error fetching data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    } else if (sortConfig.key === key && sortConfig.direction === 'asc') {
      setSortConfig({ key: 'team_name', direction: 'asc' });
      return;
    }
    setSortConfig({ key, direction });
  };

  const sortedStandings = [...standings].sort((a, b) => {
    if (sortConfig.key === 'team_name') {
      const aName = (a.team_name || '').toString();
      const bName = (b.team_name || '').toString();
      return sortConfig.direction === 'asc'
        ? aName.localeCompare(bName)
        : bName.localeCompare(aName);
    }
    const aVal = a[sortConfig.key] != null ? Number(a[sortConfig.key]) : 0;
    const bVal = b[sortConfig.key] != null ? Number(b[sortConfig.key]) : 0;
    if (sortConfig.direction === 'asc') {
      return aVal - bVal;
    }
    return bVal - aVal;
  });

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <FaSort className="inline ml-1 text-white/60" />;
    }
    return sortConfig.direction === 'asc' ? (
      <FaSortUp className="inline ml-1 text-white" />
    ) : (
      <FaSortDown className="inline ml-1 text-white" />
    );
  };

  // Helper function to get status color based on 2023/24 Premier League qualification rules
  const getStatusColor = (position, teamName) => {
    // Champions League (Positions 1-4): Emerald Green
    if (position <= 4) {
      return '#10B981'; // Emerald Green
    }
    
    // Europa League: Position 5 (Tottenham) or Manchester United (Position 8 via FA Cup)
    if (position === 5 || (teamName && teamName.toLowerCase().includes('manchester united'))) {
      return '#0EA5E9'; // Sky Blue
    }
    
    // Conference League (Position 6): Chelsea
    if (position === 6) {
      return '#F59E0B'; // Amber/Orange
    }
    
    // Relegation (Positions 18-20): Rose Red
    if (position >= 18) {
      return '#E11D48'; // Rose Red
    }
    
    // Default: transparent
    return 'transparent';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
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

  // Calculate stats for summary
  // 1. Total goals from every match of the season
  const totalGoals = matches.reduce((sum, match) => {
    const homeGoals = parseInt(match.home_team_score || 0, 10);
    const awayGoals = parseInt(match.away_team_score || 0, 10);
    return sum + homeGoals + awayGoals;
  }, 0);

  // 2. Match with highest attendance
  const highestAttendanceMatch = matches.length > 0
    ? matches.reduce((max, match) => {
        // Handle attendance - ensure it's a number, handling both number and string types
        let currentAttendance;
        if (typeof match.attendance === 'number') {
          currentAttendance = match.attendance;
        } else if (match.attendance != null && match.attendance !== '') {
          // Parse string, removing any non-numeric characters (commas, spaces, etc.)
          const cleaned = String(match.attendance).replace(/[^0-9]/g, '');
          currentAttendance = cleaned ? parseInt(cleaned, 10) : 0;
        } else {
          currentAttendance = 0;
        }
        
        let maxAttendance;
        if (typeof max.attendance === 'number') {
          maxAttendance = max.attendance;
        } else if (max.attendance != null && max.attendance !== '') {
          const cleaned = String(max.attendance).replace(/[^0-9]/g, '');
          maxAttendance = cleaned ? parseInt(cleaned, 10) : 0;
        } else {
          maxAttendance = 0;
        }
        
        return currentAttendance > maxAttendance ? match : max;
      }, matches[0])
    : { attendance: 0, home_team: 'N/A', away_team: 'N/A' };

  // 3. Team with most goals scored
  const teamWithMostGoals = sortedStandings.length > 0
    ? sortedStandings.reduce((max, team) => {
        const currentGoals = parseInt(team.gf || 0, 10);
        const maxGoals = parseInt(max.gf || 0, 10);
        return currentGoals > maxGoals ? team : max;
      }, sortedStandings[0])
    : { team_name: 'N/A', gf: 0 };

  // 4. Team with most goals conceded
  const teamWithMostConceded = sortedStandings.length > 0
    ? sortedStandings.reduce((max, team) => {
        const currentConceded = parseInt(team.ga || 0, 10);
        const maxConceded = parseInt(max.ga || 0, 10);
        return currentConceded > maxConceded ? team : max;
      }, sortedStandings[0])
    : { team_name: 'N/A', ga: 0 };

  // Find Manchester City (case-insensitive search)
  const manchesterCity = sortedStandings.find(
    team => team.team_name && (
      team.team_name.toLowerCase().includes('manchester city') ||
      team.team_name.toLowerCase() === 'manchester city'
    )
  );

  // Calculate Manchester City stats
  let manCityAvgGoals = '0.00';
  let manCityForm = 'N/A';
  
  if (manchesterCity && manchesterCity.team_id) {
    // 1. Avg goals per match (total goals scored / 38 matches)
    const manCityGoalsScored = parseInt(manchesterCity.gf || 0, 10);
    manCityAvgGoals = (manCityGoalsScored / 38).toFixed(2);
    
    // 2. Form from last 10 matches (ordered by date descending, then take last 10 and reverse for chronological)
    const manCityMatches = matches
      .filter(match => {
        const homeId = match.home_team_id;
        const awayId = match.away_team_id;
        return (homeId === manchesterCity.team_id || awayId === manchesterCity.team_id);
      })
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA; // Descending order (newest first)
      })
      .slice(0, 10)
      .reverse(); // Reverse to get chronological order (oldest to newest)
    
    if (manCityMatches.length > 0) {
      manCityForm = manCityMatches.map(match => {
        const isHome = match.home_team_id === manchesterCity.team_id;
        const homeScore = parseInt(match.home_team_score || 0, 10);
        const awayScore = parseInt(match.away_team_score || 0, 10);
        
        if (isHome) {
          if (homeScore > awayScore) return 'W';
          if (homeScore < awayScore) return 'L';
          return 'D';
        } else {
          if (awayScore > homeScore) return 'W';
          if (awayScore < homeScore) return 'L';
          return 'D';
        }
      }).join('');
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-6 border-2 border-accent/30 shadow-lg"
      >
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <FaTrophy className="text-4xl text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold text-white mb-2">
              Premier League Standings
            </h1>
            <p className="text-gray-300">Current league table with sorting options</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Summary Section */}
      {expandedSections.stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 mb-6"
        >
          <StatsSummary 
            totalGoals={totalGoals}
            highestAttendanceMatch={highestAttendanceMatch}
            teamWithMostGoals={teamWithMostGoals}
            teamWithMostConceded={teamWithMostConceded}
          />
        </motion.div>
      )}

      {/* Insights Section */}
      {expandedSections.insights && manchesterCity && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 mb-6"
        >
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-white mb-4">
            EPL 2023/2024 Champion Dashboard
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Goals Per Match</p>
              <p className="text-lg font-heading font-bold text-primary dark:text-accent">
                {manCityAvgGoals}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                ({parseInt(manchesterCity.gf || 0, 10)} goals ÷ 38 matches)
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Form (Last 10 Matches)</p>
              <p className="text-lg font-heading font-bold text-primary dark:text-accent">
                <span className="font-mono">{manCityForm}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                W = Win, L = Loss, D = Draw
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Standings Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg overflow-hidden"
      >
        {/* Qualification Legend */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-700/50 border-b border-gray-200 dark:border-neutral-700">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-semibold text-gray-700 dark:text-gray-300 mr-2">Qualification:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
              <span className="text-gray-600 dark:text-gray-400">Champions League</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#0EA5E9' }}></div>
              <span className="text-gray-600 dark:text-gray-400">Europa League</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#F59E0B' }}></div>
              <span className="text-gray-600 dark:text-gray-400">Conference League</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#E11D48' }}></div>
              <span className="text-gray-600 dark:text-gray-400">Relegation</span>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: '#38003C' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-heading font-semibold uppercase tracking-wider text-white">
                  Pos
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-heading font-semibold uppercase tracking-wider cursor-pointer text-white hover:opacity-80 transition-opacity"
                  onClick={() => handleSort('team_name')}
                >
                  Club {getSortIcon('team_name')}
                </th>
                <th
                  className="px-6 py-3 text-center text-xs font-heading font-semibold uppercase tracking-wider cursor-pointer text-white hover:opacity-80 transition-opacity"
                  onClick={() => handleSort('mp')}
                >
                  MP {getSortIcon('mp')}
                </th>
                <th
                  className="px-6 py-3 text-center text-xs font-heading font-semibold uppercase tracking-wider cursor-pointer text-white hover:opacity-80 transition-opacity"
                  onClick={() => handleSort('w')}
                >
                  W {getSortIcon('w')}
                </th>
                <th
                  className="px-6 py-3 text-center text-xs font-heading font-semibold uppercase tracking-wider cursor-pointer text-white hover:opacity-80 transition-opacity"
                  onClick={() => handleSort('d')}
                >
                  D {getSortIcon('d')}
                </th>
                <th
                  className="px-6 py-3 text-center text-xs font-heading font-semibold uppercase tracking-wider cursor-pointer text-white hover:opacity-80 transition-opacity"
                  onClick={() => handleSort('l')}
                >
                  L {getSortIcon('l')}
                </th>
                <th
                  className="px-6 py-3 text-center text-xs font-heading font-semibold uppercase tracking-wider cursor-pointer text-white hover:opacity-80 transition-opacity"
                  onClick={() => handleSort('gf')}
                >
                  GF {getSortIcon('gf')}
                </th>
                <th
                  className="px-6 py-3 text-center text-xs font-heading font-semibold uppercase tracking-wider cursor-pointer text-white hover:opacity-80 transition-opacity"
                  onClick={() => handleSort('ga')}
                >
                  GA {getSortIcon('ga')}
                </th>
                <th
                  className="px-6 py-3 text-center text-xs font-heading font-semibold uppercase tracking-wider cursor-pointer text-white hover:opacity-80 transition-opacity"
                  onClick={() => handleSort('gd')}
                >
                  GD {getSortIcon('gd')}
                </th>
                <th
                  className="px-6 py-3 text-center text-xs font-heading font-semibold uppercase tracking-wider cursor-pointer text-white hover:opacity-80 transition-opacity"
                  onClick={() => handleSort('pts')}
                >
                  Pts {getSortIcon('pts')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-700">
              <AnimatePresence>
                {sortedStandings.map((team, index) => {
                  const position = index + 1;
                  const statusColor = getStatusColor(position, team.team_name);
                  
                  return (
                    <motion.tr
                      key={team.team_id}
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className={`
                        ${index % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-gray-50/80 dark:bg-neutral-800/80'}
                        hover:bg-gray-100 dark:hover:bg-neutral-700
                        transition-all duration-300
                        border-l-4
                      `}
                      style={{
                        borderLeftColor: statusColor,
                      }}
                      whileHover={{ scale: 1.01, x: 4 }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        <Link 
                          to={`/teams/${team.team_id}`}
                          className="flex items-center space-x-3 hover:text-primary dark:hover:text-accent transition-colors"
                        >
                          {team.logo_url && (
                            <img 
                              src={team.logo_url} 
                              alt={team.team_name}
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <span className="hover:underline">{team.team_name}</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                        {team.mp}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                        {team.w}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                        {team.d}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                        {team.l}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                        {team.gf}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                        {team.ga}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white text-center">
                        {team.gd > 0 ? '+' : ''}{team.gd}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white text-center">
                        {team.pts}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Charts Section */}
      {expandedSections.charts && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          {/* Chart Filters */}
          <ChartFilters
            venue={venue}
            onVenueChange={setVenue}
            gameweekRange={gameweekRange}
            onGameweekRangeChange={setGameweekRange}
            selectedTeams={selectedTeams}
            onSelectedTeamsChange={setSelectedTeams}
            allTeams={sortedStandings}
          />

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cumulative Points Progression Chart */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6"
            >
              <CumulativePointsChart
                matches={matches}
                standings={sortedStandings}
                venue={venue}
                gameweekRange={gameweekRange}
                selectedTeams={selectedTeams}
              />
            </motion.div>

            {/* Attack vs Defense Efficiency Chart */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6"
            >
              <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-white mb-4">
                Attack vs. Defense Efficiency
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                Compare offensive output vs. defensive solidity across all teams.
              </p>
              <AttackDefenseChart
                standings={sortedStandings}
                selectedTeams={selectedTeams}
              />
            </motion.div>
          </div>

          {/* Legacy Charts Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6"
          >
            <div className="flex flex-wrap gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowGDChart(!showGDChart)}
                className={`px-4 py-2 rounded-lg border-2 transition-all duration-300 flex items-center space-x-2 ${
                  showGDChart
                    ? 'bg-primary text-white border-primary shadow-lg shadow-green-500/50'
                    : 'bg-gray-100 dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <FaChartLine />
                <span>Goal Difference Chart</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowResultsChart(!showResultsChart)}
                className={`px-4 py-2 rounded-lg border-2 transition-all duration-300 flex items-center space-x-2 ${
                  showResultsChart
                    ? 'bg-primary text-white border-primary shadow-lg shadow-green-500/50'
                    : 'bg-gray-100 dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                {showResultsChart ? <FaEye /> : <FaEyeSlash />}
                <span>Results Chart</span>
              </motion.button>
            </div>

            {showGDChart && (
              <div className="mt-6">
                <GoalDifferenceChart standings={sortedStandings} />
              </div>
            )}

            {showResultsChart && (
              <div className="mt-6">
                <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-white mb-4">
                  League Results Overview
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                  Visual representation of league-wide match results.
                </p>
                <ResultsChart matches={matches} />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

    </motion.div>
  );
};

export default Standings;
