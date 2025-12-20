import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion'; // eslint-disable-line no-unused-vars
import { useParams, Link } from 'react-router-dom';
import { FaSpinner, FaArrowLeft, FaTrophy, FaChartLine, FaUsers, FaHome, FaCalendarAlt, FaSearch, FaFilter, FaSort, FaSortUp, FaSortDown, FaCrown } from 'react-icons/fa';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
} from 'chart.js';
import {
  LineChart,
  Line,
  BarChart,
  Bar as RechartsBar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea
} from 'recharts';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// Team Themes Mapping - Official Premier League Team Colors
const TEAM_THEMES = {
  'Arsenal': '#EF0107',
  'Aston Villa': '#95BFE5',
  'Bournemouth': '#DA020E',
  'Brentford': '#E30613',
  'Brighton & Hove Albion': '#0057B8',
  'Burnley': '#6C1D45',
  'Chelsea': '#034694',
  'Crystal Palace': '#1B458F',
  'Everton': '#003399',
  'Fulham': '#000000',
  'Liverpool': '#C8102E',
  'Luton Town': '#FF8C00',
  'Manchester City': '#6CABDD',
  'Manchester United': '#DA020E',
  'Newcastle United': '#241F20',
  'Nottingham Forest': '#DD0000',
  'Sheffield United': '#EE2737',
  'Tottenham Hotspur': '#132257',
  'West Ham United': '#7A263A',
  'Wolverhampton Wanderers': '#FDB913',
  // Fallback for any team not listed
  'default': '#38003C' // EPL Purple
};

const ClubDetail = () => {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [squad, setSquad] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [positionFilter, setPositionFilter] = useState('all');
  const [searchName, setSearchName] = useState('');
  const [searchNationality, setSearchNationality] = useState('');
  const [captainFilter, setCaptainFilter] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'player_name', direction: 'asc' });
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedMatchweek, setSelectedMatchweek] = useState(null);
  const [activeVenue, setActiveVenue] = useState('All'); // 'All', 'Home', or 'Away'

  // Get team color
  const teamColor = useMemo(() => {
    if (!team) return TEAM_THEMES.default;
    return TEAM_THEMES[team.team_name] || TEAM_THEMES.default;
  }, [team]);

  // Fetch all data
  useEffect(() => {
    let isMounted = true;

    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch team metadata
        const teamResponse = await fetch(`/api/clubs/${id}`);
        if (!teamResponse.ok) throw new Error('Failed to fetch team details');
        const teamData = await teamResponse.json();
        if (isMounted) setTeam(teamData.data);

        // Fetch squad
        const squadResponse = await fetch(`/api/clubs/${id}/squad`);
        if (squadResponse.ok) {
          const squadData = await squadResponse.json();
          if (isMounted) setSquad(squadData.data || []);
        }

        // Fetch all matches
        const matchesResponse = await fetch('/api/matches');
        if (!matchesResponse.ok) throw new Error('Failed to fetch matches');
        const matchesData = await matchesResponse.json();
        
        // Filter matches for this team
        const teamMatches = (matchesData.data || []).filter(match => 
          String(match.home_team_id) === String(id) || String(match.away_team_id) === String(id)
        );
        if (isMounted) {
          setMatches(teamMatches);
          console.log(`✅ Found ${teamMatches.length} matches for team ${id}`);
        }

        // Fetch standings
        const standingsResponse = await fetch('/api/standings');
        if (!standingsResponse.ok) throw new Error('Failed to fetch standings');
        const standingsData = await standingsResponse.json();
        if (isMounted) setStandings(standingsData.data || []);

        // Fetch analytics data
        const analyticsResponse = await fetch(`/api/analytics/club/${id}`);
        if (analyticsResponse.ok) {
          const analyticsData = await analyticsResponse.json();
          if (isMounted) {
            setAnalyticsData(analyticsData.data);
            // Set initial selected matchweek to the last one
            if (analyticsData.data?.timeseries?.length > 0) {
              const lastMatchweek = analyticsData.data.timeseries[analyticsData.data.timeseries.length - 1];
              setSelectedMatchweek(lastMatchweek);
            }
          }
        }

      } catch (err) {
        // Only set error if component is still mounted and it's a real error
        if (isMounted && err instanceof Error) {
        setError(err.message);
        }
      } finally {
        if (isMounted) {
        setLoading(false);
        }
      }
    };

    if (id) {
      fetchAllData();
    }

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Generate logo URL for team
  const getLogoUrl = (teamName) => {
    if (!teamName) return '';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName)}&background=${teamColor.replace('#', '')}&color=fff&size=256`;
  };

  // Helper function to parse attendance as integer
  const parseAttendance = (attendance) => {
    if (attendance == null || attendance === '' || attendance === undefined) {
      return null;
    }
    if (typeof attendance === 'number') {
      return isNaN(attendance) ? null : attendance;
    }
    // Parse string, removing any non-numeric characters (commas, spaces, etc.)
    const cleaned = String(attendance).replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned, 10) : null;
  };

  // Calculate statistics from matches
  const stats = useMemo(() => {
    if (!matches || matches.length === 0) return null;

    const teamMatches = matches.map(match => {
      const isHome = String(match.home_team_id) === String(id);
      const teamScore = isHome ? match.home_team_score : match.away_team_score;
      const opponentScore = isHome ? match.away_team_score : match.home_team_score;
      const opponent = isHome ? match.away_team : match.home_team;
      const date = new Date(match.date);

      let result = 'D';
      if (teamScore > opponentScore) result = 'W';
      else if (teamScore < opponentScore) result = 'L';

      return {
        ...match,
        isHome,
        teamScore,
        opponentScore,
        opponent,
        result,
        goalDifference: teamScore - opponentScore,
        totalGoals: teamScore + opponentScore,
        date
      };
    });

    // Sort by date (most recent first for form guide)
    teamMatches.sort((a, b) => b.date - a.date);

    // Calculate stats
    const totalGoalsFor = teamMatches.reduce((sum, m) => sum + m.teamScore, 0);
    const totalGoalsAgainst = teamMatches.reduce((sum, m) => sum + m.opponentScore, 0);
    
    const wins = teamMatches.filter(m => m.result === 'W');
    const losses = teamMatches.filter(m => m.result === 'L');
    const draws = teamMatches.filter(m => m.result === 'D');

    // Biggest win
    const biggestWin = wins.length > 0 
      ? wins.reduce((max, m) => m.goalDifference > max.goalDifference ? m : max, wins[0])
      : null;

    // Heaviest defeat
    const heaviestDefeat = losses.length > 0
      ? losses.reduce((max, m) => m.goalDifference < max.goalDifference ? m : max, losses[0])
      : null;

    // Match with highest goals
    const highestGoalsMatch = teamMatches.reduce((max, m) => 
      m.totalGoals > max.totalGoals ? m : max, teamMatches[0]
    );

    // Match with lowest goals
    const lowestGoalsMatch = teamMatches.reduce((min, m) => 
      m.totalGoals < min.totalGoals ? m : min, teamMatches[0]
    );

    // Attendance records (home games only)
    // Parse attendance for all matches first
    const matchesWithParsedAttendance = teamMatches.map(m => ({
      ...m,
      attendance: parseAttendance(m.attendance)
    }));
    
    const homeMatches = matchesWithParsedAttendance.filter(m => m.isHome && m.attendance != null && !isNaN(m.attendance));
    const highestAttendance = homeMatches.length > 0
      ? homeMatches.reduce((max, m) => {
          const maxAttendance = max.attendance;
          const mAttendance = m.attendance;
          return (mAttendance != null && maxAttendance != null && mAttendance > maxAttendance) ? m : max;
        }, homeMatches[0])
      : null;
    const lowestAttendance = homeMatches.length > 0
      ? homeMatches.reduce((min, m) => {
          const minAttendance = min.attendance;
          const mAttendance = m.attendance;
          return (mAttendance != null && minAttendance != null && mAttendance < minAttendance) ? m : min;
        }, homeMatches[0])
      : null;

    // Last 10 matches for form guide (most recent first, then take first 10)
    const last10Matches = teamMatches.slice(0, 10);

    return {
      totalGoalsFor,
      totalGoalsAgainst,
      wins: wins.length,
      draws: draws.length,
      losses: losses.length,
      biggestWin,
      heaviestDefeat,
      highestGoalsMatch,
      lowestGoalsMatch,
      highestAttendance,
      lowestAttendance,
      last10Matches,
      totalMatches: teamMatches.length
    };
  }, [matches, id]);

  // Get league position with ordinal formatting (matching Standings.jsx sorting logic)
  const leaguePosition = useMemo(() => {
    if (!standings || standings.length === 0 || !team) return null;
    
    // Sort standings the same way as Standings.jsx (by points descending, then by goal difference, etc.)
    const sortedStandings = [...standings].sort((a, b) => {
      // Primary sort: Points (descending)
      const aPts = a.pts != null ? Number(a.pts) : 0;
      const bPts = b.pts != null ? Number(b.pts) : 0;
      if (bPts !== aPts) return bPts - aPts;
      
      // Secondary sort: Goal difference (descending)
      const aGd = a.gd != null ? Number(a.gd) : 0;
      const bGd = b.gd != null ? Number(b.gd) : 0;
      if (bGd !== aGd) return bGd - aGd;
      
      // Tertiary sort: Goals for (descending)
      const aGf = a.gf != null ? Number(a.gf) : 0;
      const bGf = b.gf != null ? Number(b.gf) : 0;
      if (bGf !== aGf) return bGf - aGf;
      
      // Final sort: Team name (ascending) for consistency
      const aName = (a.team_name || '').toString();
      const bName = (b.team_name || '').toString();
      return aName.localeCompare(bName);
    });
    
    const index = sortedStandings.findIndex(s => String(s.team_id) === String(id));
    if (index < 0) return null;
    const position = index + 1;
    
    // Format as ordinal (1st, 2nd, 3rd, etc.)
    const getOrdinal = (n) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    return getOrdinal(position);
  }, [standings, id, team]);

  // Filter and sort squad
  const filteredSquad = useMemo(() => {
    let filtered = [...squad];

    // Filter by name
    if (searchName) {
      filtered = filtered.filter(player =>
        player.player_name && player.player_name.toLowerCase().includes(searchName.toLowerCase())
      );
    }

    // Filter by nationality
    if (searchNationality) {
      filtered = filtered.filter(player =>
        player.nationality && player.nationality.toLowerCase().includes(searchNationality.toLowerCase())
      );
    }

    // Filter by position
    if (positionFilter !== 'all') {
      const positionMap = {
        'Goalkeeper': ['GK', 'Goalkeeper'],
        'Defender': ['DF', 'Defender'],
        'Midfielder': ['MF', 'Midfielder'],
        'Forward': ['FW', 'Forward']
      };
      const validPositions = positionMap[positionFilter] || [];
      filtered = filtered.filter(player => 
        validPositions.some(pos => 
          player.position === pos || 
          (player.position && player.position.toLowerCase().includes(pos.toLowerCase()))
        )
      );
    }

    // Filter by captain
    if (captainFilter) {
      filtered = filtered.filter(player => player.is_captain === true);
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      // Define string fields that should be compared as strings
      const stringFields = ['player_name', 'position', 'nationality'];
      
      if (stringFields.includes(sortConfig.key)) {
        // Handle string comparison with null checks
        const aStr = (aVal || '').toString();
        const bStr = (bVal || '').toString();
        return sortConfig.direction === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      }
      
      // Handle numeric comparison with null checks
      const aNum = aVal != null ? Number(aVal) : 0;
      const bNum = bVal != null ? Number(bVal) : 0;
      return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
    });

    return filtered;
  }, [squad, positionFilter, searchName, searchNationality, captainFilter, sortConfig]);

  // Handle sort
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Get sort icon
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

  // Get position abbreviation
  const getPositionAbbreviation = (position) => {
    const abbrev = {
      'Goalkeeper': 'GK',
      'Defender': 'DEF',
      'Midfielder': 'MID',
      'Forward': 'FWD'
    };
    return abbrev[position] || position;
  };

  // Get position color
  const getPositionColor = (position) => {
    const colors = {
      'Goalkeeper': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
      'Defender': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700',
      'Midfielder': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700',
      'Forward': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'
    };
    return colors[position] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700';
  };

  // Filter data for pie chart based on activeVenue
  const filteredDataForPie = useMemo(() => {
    if (!analyticsData || !analyticsData.timeseries || analyticsData.timeseries.length === 0) return [];
    
    if (activeVenue === 'All') {
      return analyticsData.timeseries;
    } else if (activeVenue === 'Home') {
      return analyticsData.timeseries.filter(d => (d.venue || 'N/A') === 'Home');
    } else if (activeVenue === 'Away') {
      return analyticsData.timeseries.filter(d => (d.venue || 'N/A') === 'Away');
    }
    return analyticsData.timeseries;
  }, [activeVenue, analyticsData]);

  // Calculate pie chart data by grouping 'result' column from filtered data
  const pieChartData = useMemo(() => {
    if (!filteredDataForPie || filteredDataForPie.length === 0) return [];
    
    // Group by 'result' column with error handling
    const resultCounts = { W: 0, D: 0, L: 0 };
    
    filteredDataForPie.forEach(row => {
      const result = row.result || 'N/A';
      if (result === 'W' || result === 'w') {
        resultCounts.W++;
      } else if (result === 'D' || result === 'd') {
        resultCounts.D++;
      } else if (result === 'L' || result === 'l') {
        resultCounts.L++;
      }
    });
    
    return [
      { name: 'Wins', value: resultCounts.W, color: '#10B981' }, // Emerald
      { name: 'Draws', value: resultCounts.D, color: '#94A3B8' }, // Slate
      { name: 'Losses', value: resultCounts.L, color: '#E11D48' } // Rose
    ].filter(item => item.value > 0);
  }, [filteredDataForPie]);
  
  // Calculate bar chart data by grouping 'venue' and 'result' from timeseries data
  const barChartData = useMemo(() => {
    if (!analyticsData || !analyticsData.timeseries || analyticsData.timeseries.length === 0) {
      return [
        { venue: 'Home', W: 0, D: 0, L: 0, opacity: 1 },
        { venue: 'Away', W: 0, D: 0, L: 0, opacity: 1 }
      ];
    }
    
    // Group by venue and result
    const venueStats = {
      Home: { W: 0, D: 0, L: 0 },
      Away: { W: 0, D: 0, L: 0 }
    };
    
    analyticsData.timeseries.forEach(row => {
      const venue = row.venue || 'N/A';
      const result = row.result || 'N/A';
      
      if (venue === 'Home' && (result === 'W' || result === 'w')) {
        venueStats.Home.W++;
      } else if (venue === 'Home' && (result === 'D' || result === 'd')) {
        venueStats.Home.D++;
      } else if (venue === 'Home' && (result === 'L' || result === 'l')) {
        venueStats.Home.L++;
      } else if (venue === 'Away' && (result === 'W' || result === 'w')) {
        venueStats.Away.W++;
      } else if (venue === 'Away' && (result === 'D' || result === 'd')) {
        venueStats.Away.D++;
      } else if (venue === 'Away' && (result === 'L' || result === 'l')) {
        venueStats.Away.L++;
      }
    });
    
    return [
      {
        venue: 'Home',
        W: venueStats.Home.W,
        D: venueStats.Home.D,
        L: venueStats.Home.L,
        opacity: activeVenue === 'All' || activeVenue === 'Home' ? 1 : 0.3
      },
      {
        venue: 'Away',
        W: venueStats.Away.W,
        D: venueStats.Away.D,
        L: venueStats.Away.L,
        opacity: activeVenue === 'All' || activeVenue === 'Away' ? 1 : 0.3
      }
    ];
  }, [analyticsData, activeVenue]);

  // Chart data for goals (Bar chart)
  const goalsChartData = useMemo(() => {
    if (!stats) {
      console.log('⚠ No stats available for goals chart');
      return null;
    }
    
    const goalsFor = stats.totalGoalsFor || 0;
    const goalsAgainst = stats.totalGoalsAgainst || 0;

    const chartData = {
      labels: ['Goals For', 'Goals Against'],
      datasets: [{
        label: 'Goals',
        data: [goalsFor, goalsAgainst],
        backgroundColor: [
          teamColor, // Team color for goals for
          '#EF0107'  // Red for goals against (as specified)
        ],
        borderColor: [
          teamColor,
          '#EF0107'
        ],
        borderWidth: 2
      }]
    };
    
    console.log('📊 Goals chart data:', chartData);
    return chartData;
  }, [stats, teamColor]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <FaSpinner className="animate-spin text-4xl text-primary" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">Error loading team</p>
        <p>{error || 'Team not found'}</p>
        <Link to="/clubs" className="text-primary hover:underline mt-2 inline-block">
          ← Back to Clubs
        </Link>
      </div>
    );
  }


  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Hero Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl shadow-lg overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${teamColor} 0%, ${teamColor}dd 100%)` }}
      >
        <div className="p-8 text-white">
          <div className="flex items-center space-x-4 mb-6">
            <Link
              to="/clubs"
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Back to clubs"
            >
              <FaArrowLeft className="text-2xl" />
            </Link>
            <div className="flex-1 flex items-center gap-6">
              <img
                src={team.logo_url || getLogoUrl(team.team_name)}
                alt={team.team_name}
                className="w-24 h-24 rounded-full bg-white/20 p-2"
                onError={(e) => {
                  e.target.src = getLogoUrl(team.team_name);
                }}
              />
              <div className="flex-1">
                <h1 className="text-5xl font-heading font-bold mb-3 text-white">
                  {team.team_name}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-white/90">
                  {team.founded_year && (
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt />
                      <span>Founded {team.founded_year}</span>
                    </div>
                  )}
                  {team.stadium_name && (
                    <div className="flex items-center gap-2">
                      <FaHome />
                      <span>{team.stadium_name}</span>
                      {team.stadium_capacity && (
                        <span className="text-white/70">
                          ({team.stadium_capacity.toLocaleString()} capacity)
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-6 mt-4 text-lg">
                  <div className="flex items-center gap-2">
                    <FaUsers className="text-white/80" />
                    <span className="font-semibold">Manager:</span>
                    <span>{team.manager_name || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Performance Dashboard */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6"
        >
          <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <FaChartLine className="text-primary" />
            Performance Dashboard
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* League Position */}
            {leaguePosition && (
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">League Position</div>
                <div className="text-3xl font-bold text-primary">{leaguePosition}</div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">of {standings.length} teams</div>
              </div>
            )}

            {/* Goal Stats */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Goals</div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {stats.totalGoalsFor} <span className="text-lg text-gray-600 dark:text-gray-400">GF</span>
              </div>
              <div className="text-lg font-semibold text-red-600 dark:text-red-400 mt-1">
                {stats.totalGoalsAgainst} <span className="text-sm text-gray-600 dark:text-gray-400">GA</span>
              </div>
            </div>

            {/* Biggest Win */}
            {stats.biggestWin && (
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Biggest Win</div>
                <div className="text-lg font-bold text-green-700 dark:text-green-400">
                  vs {stats.biggestWin.opponent} ({stats.biggestWin.teamScore}-{stats.biggestWin.opponentScore})
                </div>
              </div>
            )}

            {/* Heaviest Defeat */}
            {stats.heaviestDefeat && (
              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/10 rounded-lg p-4 border border-red-200 dark:border-red-800">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Heaviest Defeat</div>
                <div className="text-lg font-bold text-red-700 dark:text-red-400">
                  vs {stats.heaviestDefeat.opponent} ({stats.heaviestDefeat.opponentScore}-{stats.heaviestDefeat.teamScore})
                </div>
              </div>
            )}

            {/* Highest Goals Match */}
            {stats.highestGoalsMatch && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Highest Scoring Match</div>
                <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
                  {stats.highestGoalsMatch.totalGoals} goals
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {stats.highestGoalsMatch.teamScore}-{stats.highestGoalsMatch.opponentScore} vs {stats.highestGoalsMatch.opponent}
                </div>
              </div>
            )}

            {/* Lowest Goals Match */}
            {stats.lowestGoalsMatch && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/20 dark:to-gray-700/10 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Lowest Scoring Match</div>
                <div className="text-lg font-bold text-gray-700 dark:text-gray-400">
                  {stats.lowestGoalsMatch.totalGoals} goals
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {stats.lowestGoalsMatch.teamScore}-{stats.lowestGoalsMatch.opponentScore} vs {stats.lowestGoalsMatch.opponent}
                </div>
              </div>
            )}

            {/* Attendance Records */}
            {stats.highestAttendance && (
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/10 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Highest Attendance at Home</div>
                <div className="text-lg font-bold text-purple-700 dark:text-purple-400">
                  {(() => {
                    const attendance = parseAttendance(stats.highestAttendance.attendance);
                    return attendance != null && !isNaN(attendance) 
                      ? new Intl.NumberFormat('en-US').format(attendance) 
                      : 'N/A';
                  })()}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  vs {stats.highestAttendance.opponent}
                </div>
              </div>
            )}

            {stats.lowestAttendance && (
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/10 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Lowest Attendance at Home</div>
                <div className="text-lg font-bold text-purple-700 dark:text-purple-400">
                  {(() => {
                    const attendance = parseAttendance(stats.lowestAttendance.attendance);
                    return attendance != null && !isNaN(attendance) 
                      ? new Intl.NumberFormat('en-US').format(attendance) 
                      : 'N/A';
                  })()}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  vs {stats.lowestAttendance.opponent}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Form Guide */}
      {stats && stats.last10Matches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6"
        >
          <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white mb-4">
            Form Guide (Last 10 Matches)
          </h2>
          <div className="flex flex-wrap gap-2">
            {stats.last10Matches.map((match, index) => {
              const bgColor = match.result === 'W' 
                ? 'bg-[#00FF85] hover:bg-[#00E677]' 
                : match.result === 'D' 
                ? 'bg-[#9CA3AF] hover:bg-[#6B7280]' 
                : 'bg-[#EF0107] hover:bg-[#DC0106]';
              
              // Format date nicely (e.g., "Aug 12")
              const matchDate = new Date(match.date);
              const formattedDate = matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const tooltipText = `${match.isHome ? 'vs' : 'at'} ${match.opponent} (${match.teamScore}-${match.opponentScore}) - ${formattedDate}`;
              
              return (
                <div
                  key={index}
                  className={`${bgColor} text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg relative group`}
                  title={tooltipText}
                >
                  {match.result}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {tooltipText}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Goals Charts Section - Side by Side */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Goals Chart (Bar) */}
          {goalsChartData ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6"
            >
              <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white mb-4">
                Goals (GF/GA)
              </h2>
              <div className="h-96">
                <Bar 
                  data={goalsChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return `${context.label}: ${context.parsed.y}`;
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1
                        }
                      }
                    }
                  }}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6"
            >
              <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white mb-4">
                Goals (GF/GA)
              </h2>
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                No goal data available
              </div>
            </motion.div>
          )}

          {/* Season Path: Goals For vs Goals Against */}
          {analyticsData && analyticsData.timeseries && analyticsData.timeseries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6"
            >
              <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white mb-4">
                Season Path: Goals For vs Goals Against
              </h2>
              <div className="h-96 relative" style={{ aspectRatio: '1' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={analyticsData.timeseries}
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <defs>
                      {/* Background zones as polygons */}
                      <polygon id="attackingZone" points="0,110 110,0 110,110" fill="rgba(16, 185, 129, 0.08)" />
                      <polygon id="defensiveZone" points="0,0 0,110 110,0" fill="rgba(225, 29, 72, 0.08)" />
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#38003C" opacity={0.2} />
                    <XAxis 
                      type="number" 
                      dataKey="cumulative_ga" 
                      name="Goals Against"
                      domain={[0, 110]}
                      label={{ value: 'Goals Against', position: 'insideBottom', offset: -5 }}
                      stroke="#38003C"
                    />
                    <YAxis 
                      type="number" 
                      dataKey="cumulative_gf" 
                      name="Goals For"
                      domain={[0, 110]}
                      label={{ value: 'Goals For', angle: -90, position: 'insideLeft' }}
                      stroke="#38003C"
                    />
                    {/* Background Shading - Attacking Dominance (Upper-Left: y > x) */}
                    <ReferenceArea 
                      x1={0} 
                      y1={110} 
                      x2={110} 
                      y2={0}
                      fill="rgba(16, 185, 129, 0.08)"
                      ifOverflow="visible"
                    />
                    {/* Background Shading - Defensive Deficit (Lower-Right: y < x) */}
                    <ReferenceArea 
                      x1={0} 
                      y1={0} 
                      x2={110} 
                      y2={110}
                      fill="rgba(225, 29, 72, 0.08)"
                      ifOverflow="visible"
                    />
                    {/* Bisector Line (y=x) - diagonal line from (0,0) to (110,110) */}
                    <ReferenceLine 
                      segment={[{ x: 0, y: 0 }, { x: 110, y: 110 }]}
                      stroke="#6B7280" 
                      strokeDasharray="5 5" 
                      strokeWidth={1.5}
                      ifOverflow="visible"
                    />
                    {/* Custom Tooltip */}
                    <RechartsTooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload[0]) return null;
                        
                        const data = payload[0].payload;
                        const matchweek = data.matchweek || '';
                        const result = data.result || 'N/A';
                        const cumulativeGf = data.cumulative_gf || 0;
                        const cumulativeGa = data.cumulative_ga || 0;
                        const netGd = cumulativeGf - cumulativeGa;
                        const venue = data.venue || 'N/A';
                        const goalsScored = data.goals_scored || 0;
                        const goalsConceded = data.goals_conceded || 0;
                        
                        return (
                          <div className="bg-slate-900 border-2 border-[#00FF85] rounded-lg p-4 shadow-xl">
                            <div className="text-white font-bold text-lg mb-2">
                              Matchweek {matchweek}
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="text-white">
                                <span className="text-gray-400">Result:</span> {result} vs {data.opponent_name || 'Opponent'} ({venue})
                              </div>
                              <div className="text-white">
                                <span className="text-gray-400">Match Score:</span> {goalsScored} - {goalsConceded}
                              </div>
                              <div className="text-white">
                                <span className="text-gray-400">Total GF:</span> {cumulativeGf} | <span className="text-gray-400">Total GA:</span> {cumulativeGa}
                              </div>
                              <div className={`font-semibold ${netGd >= 0 ? 'text-[#10B981]' : 'text-[#E11D48]'}`}>
                                <span className="text-gray-400">Net GD:</span> {netGd >= 0 ? '+' : ''}{netGd}
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulative_gf"
                      stroke="#00FF85"
                      strokeWidth={2}
                      dot={false}
                      name="Season Path"
                    />
                    <Scatter
                      name="Season Path"
                      dataKey="cumulative_gf"
                      fill="#00FF85"
                      shape={(props) => {
                        const { cx, cy, payload } = props;
                        const isLatest = payload.matchweek === analyticsData.timeseries[analyticsData.timeseries.length - 1]?.matchweek;
                        return (
                          <g>
                            <circle
                              cx={cx}
                              cy={cy}
                              r={isLatest ? 6 : 4}
                              fill="#00FF85"
                              stroke={isLatest ? "#FFFFFF" : "none"}
                              strokeWidth={isLatest ? 2 : 0}
                              opacity={isLatest ? 1 : 0.8}
                            />
                            {isLatest && (
                              <circle
                                cx={cx}
                                cy={cy}
                                r={8}
                                fill="none"
                                stroke="#00FF85"
                                strokeWidth={2}
                                opacity={0.5}
                                className="animate-ping"
                              />
                            )}
                          </g>
                        );
                      }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Feature A: Performance Progression & Cards */}
      {analyticsData && analyticsData.timeseries && analyticsData.timeseries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6"
        >
          <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <FaChartLine className="text-primary" />
            Performance Progression
          </h2>
          
          {/* Stat Cards */}
          {selectedMatchweek && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Points</div>
                <div className="text-2xl font-bold text-primary">{selectedMatchweek.cumulative_points}</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Goal Difference</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">{selectedMatchweek.cumulative_gd > 0 ? '+' : ''}{selectedMatchweek.cumulative_gd}</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Goals For</div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{selectedMatchweek.cumulative_gf}</div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/10 rounded-lg p-4 border border-red-200 dark:border-red-800">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Goals Against</div>
                <div className="text-2xl font-bold text-red-700 dark:text-red-400">{selectedMatchweek.cumulative_ga}</div>
              </div>
            </div>
          )}

          {/* Position Progression Line Chart */}
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={analyticsData.timeseries}
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const matchweek = data.activePayload[0].payload.matchweek;
                    const selected = analyticsData.timeseries.find(d => d.matchweek === matchweek);
                    if (selected) setSelectedMatchweek(selected);
                  }
                }}
                onMouseMove={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const matchweek = data.activePayload[0].payload.matchweek;
                    const selected = analyticsData.timeseries.find(d => d.matchweek === matchweek);
                    if (selected) setSelectedMatchweek(selected);
                  }
                }}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#38003C" opacity={0.2} />
                <XAxis 
                  dataKey="matchweek" 
                  label={{ value: 'Matchweek', position: 'insideBottom', offset: -5 }}
                  stroke="#38003C"
                />
                <YAxis 
                  reversed
                  domain={[1, 20]}
                  ticks={Array.from({ length: 20 }, (_, i) => i + 1)}
                  label={{ value: 'Position', angle: -90, position: 'insideLeft' }}
                  stroke="#38003C"
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '2px solid #00FF85',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                  }}
                  itemStyle={{
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                  labelStyle={{
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: '700'
                  }}
                  labelFormatter={(label) => `Matchweek ${label}`}
                  formatter={(value) => [`Position ${value}`, '']}
                />
                <Line 
                  type="monotone" 
                  dataKey="position" 
                  stroke="#00FF85" 
                  strokeWidth={3}
                  dot={{ fill: '#00FF85', r: 5 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Feature B: Venue-Based Results */}
      {analyticsData && analyticsData.timeseries && analyticsData.timeseries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Clustered Bar Chart */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white mb-4">
              Results by Venue
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  onClick={(data) => {
                    if (data && data.activePayload && data.activePayload[0]) {
                      const venue = data.activePayload[0].payload.venue;
                      setActiveVenue(activeVenue === venue ? 'All' : venue);
                    }
                  }}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#38003C" opacity={0.2} />
                  <XAxis dataKey="venue" stroke="#38003C" />
                  <YAxis stroke="#38003C" />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '2px solid #00FF85',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                    }}
                    itemStyle={{
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                    labelStyle={{
                      color: '#FFFFFF',
                      fontSize: '16px',
                      fontWeight: '700'
                    }}
                  />
                  <RechartsLegend />
                  <RechartsBar 
                    dataKey="W" 
                    stackId="a" 
                    fill="#10B981"
                    style={{ cursor: 'pointer' }}
                  >
                    {barChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-w-${index}`} 
                        fill="#10B981"
                        opacity={entry.opacity}
                      />
                    ))}
                  </RechartsBar>
                  <RechartsBar 
                    dataKey="D" 
                    stackId="a" 
                    fill="#94A3B8"
                    style={{ cursor: 'pointer' }}
                  >
                    {barChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-d-${index}`} 
                        fill="#94A3B8"
                        opacity={entry.opacity}
                      />
                    ))}
                  </RechartsBar>
                  <RechartsBar 
                    dataKey="L" 
                    stackId="a" 
                    fill="#E11D48"
                    style={{ cursor: 'pointer' }}
                  >
                    {barChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-l-${index}`} 
                        fill="#E11D48"
                        opacity={entry.opacity}
                      />
                    ))}
                  </RechartsBar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
                {activeVenue === 'All' ? 'Overall Results' : `${activeVenue} Results`}
              </h2>
              {activeVenue !== 'All' && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setActiveVenue('All')}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors text-sm font-semibold"
                >
                  Reset Filter
                </motion.button>
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Showing Results for: <span className="font-semibold text-primary">{activeVenue}</span>
            </div>
            <div className="h-80">
              {pieChartData && pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={600}
                      animationEasing="ease-out"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '2px solid #00FF85',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                      }}
                      itemStyle={{
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                      labelStyle={{
                        color: '#FFFFFF',
                        fontSize: '16px',
                        fontWeight: '700',
                        marginBottom: '4px'
                      }}
                      formatter={(value, name) => {
                        return [`${value} ${name}`, ''];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  No result data available
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}


      {/* Full Squad List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200 dark:border-neutral-700">
          <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white mb-4">
            Full Squad
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Showing {filteredSquad.length} of {squad.length} players
          </p>
          
          {/* Filters */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div
                className="relative"
                whileHover={{ scale: 1.02 }}
              >
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-300 focus:border-green-400 transition-all duration-300"
                />
              </motion.div>

              <motion.div
                className="relative"
                whileHover={{ scale: 1.02 }}
              >
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by nationality..."
                  value={searchNationality}
                  onChange={(e) => setSearchNationality(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-300 focus:border-green-400 transition-all duration-300"
                />
              </motion.div>

              <motion.div
                className="relative"
                whileHover={{ scale: 1.02 }}
              >
                <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                <select
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-300 focus:border-green-400 appearance-none transition-all duration-300 hover:shadow-xl"
                >
                  <option value="all">All Positions</option>
                  <option value="Goalkeeper">Goalkeeper</option>
                  <option value="Defender">Defender</option>
                  <option value="Midfielder">Midfielder</option>
                  <option value="Forward">Forward</option>
                </select>
              </motion.div>

              <motion.button
                onClick={() => setCaptainFilter(!captainFilter)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-semibold text-sm
                  transition-all duration-300 shadow-md
                  ${captainFilter 
                    ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-yellow-900 border-2 border-yellow-300 dark:border-yellow-700 shadow-lg' 
                    : 'bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-neutral-600 hover:bg-gray-200 dark:hover:bg-neutral-600'
                  }
                `}
              >
                <FaCrown className={captainFilter ? 'text-yellow-900' : 'text-gray-500 dark:text-gray-400'} />
                <span>{captainFilter ? 'Captains Only' : 'Show Captains'}</span>
              </motion.button>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
            <thead className="bg-primary text-white sticky top-0 z-10">
              <tr>
                {['player_name', 'position', 'nationality', 'jersey_number'].map((key) => (
                  <th
                    key={key}
                    className="px-6 py-3 text-left text-xs font-heading font-semibold uppercase tracking-wider cursor-pointer hover:bg-primary/80 transition-colors"
                    onClick={() => handleSort(key)}
                  >
                    {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    <motion.span
                      animate={{ rotate: sortConfig.key === key ? [0, 360] : 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      {getSortIcon(key)}
                    </motion.span>
                </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-700">
              {filteredSquad.map((player, index) => (
                <motion.tr
                  key={player.id || `player-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`
                    ${index % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-gray-50/80 dark:bg-neutral-800/80'}
                    hover:bg-blue-50/70 dark:hover:bg-blue-900/70
                    transition-all duration-300
                  `}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    <div className="flex items-center space-x-2">
                      <span>{player.player_name}</span>
                      {player.is_captain && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-yellow-900 shadow-lg border border-yellow-300 dark:border-yellow-700"
                          title="Team Captain"
                        >
                          <FaCrown className="mr-1" />
                          C
                        </motion.span>
                      )}
                    </div>
                        </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getPositionColor(player.position)}`}>
                      {getPositionAbbreviation(player.position)}
                    </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {player.nationality || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {player.jersey_number || 'N/A'}
                        </td>
                </motion.tr>
                    ))}
            </tbody>
          </table>
          {filteredSquad.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No players found matching your filters.
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ClubDetail;
