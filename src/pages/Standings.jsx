import { useState, useEffect, useMemo, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaSort, FaSortUp, FaSortDown, FaSpinner, FaChartLine, FaTrophy, FaEye, FaEyeSlash, FaPlay, FaPause, FaCrown, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import TeamLogo from '../components/TeamLogo';
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
  const [expandedSections] = useState({
    stats: true,
    insights: true,
    charts: true,
  });

  // Chart filter states
  const [venue, setVenue] = useState('all');
  const [gameweekRange, setGameweekRange] = useState([1, 38]);
  const [selectedTeams, setSelectedTeams] = useState([]);

  // Time Machine states
  const [selectedMatchweek, setSelectedMatchweek] = useState(38);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef(null);

  // Title Race Simulator states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedScores, setSimulatedScores] = useState({}); // { matchId: { homeScore, awayScore } }

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
          
          // Set initial matchweek to max available matchweek
          const maxMatchweek = Math.max(...(matchesData.data || []).map(m => m.matchweek || 0).filter(mw => mw > 0), 38);
          setSelectedMatchweek(maxMatchweek);
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

  // Cleanup play interval on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
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

  // Pre-calculate standings for ALL 38 matchweeks ONCE when matches/standings change
  // This makes slider navigation instant (0ms latency) by just indexing into pre-computed array
  const memoizedStandings = useMemo(() => {
    if (!matches || matches.length === 0 || !standings || standings.length === 0) {
      return {};
    }

    // Create a map of all teams with their base info (for logo_url, total_adjustment, etc.)
    const teamInfoMap = new Map();
    standings.forEach(team => {
      teamInfoMap.set(team.team_id, {
        team_id: team.team_id,
        team_name: team.team_name,
        logo_url: team.logo_url,
        total_adjustment: team.total_adjustment || 0,
      });
    });

    // Pre-calculate standings for each matchweek (0-38)
    // Matchweek 0 = all teams at 0 points (start of season)
    const standingsByMatchweek = {};
    
    for (let targetMW = 0; targetMW <= 38; targetMW++) {
      // Initialize team stats map
      const teamStatsMap = new Map();
      
      // Initialize all teams from teamInfoMap
      teamInfoMap.forEach((teamInfo, teamId) => {
        teamStatsMap.set(teamId, {
          team_id: teamId,
          team_name: teamInfo.team_name,
          logo_url: teamInfo.logo_url,
          mp: 0,
          w: 0,
          d: 0,
          l: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          pts: 0,
          total_adjustment: teamInfo.total_adjustment || 0,
        });
      });

      // For matchweek 0, all teams remain at 0 (no matches processed)
      if (targetMW === 0) {
        const standingsArray = Array.from(teamStatsMap.values()).map(team => ({
          ...team,
          gd: 0,
          pts: 0, // No point adjustments for matchweek 0
        }));

        // Sort by team name for matchweek 0 (all have 0 points)
        standingsArray.sort((a, b) => {
          return a.team_name.localeCompare(b.team_name);
        });

        standingsByMatchweek[0] = standingsArray;
        continue;
      }

      // Filter matches up to target matchweek
      const filteredMatches = matches.filter(m => {
        const mw = Number(m.matchweek) || 0;
        return mw > 0 && mw <= targetMW;
      });

      // De-duplication: Track processed match IDs to prevent counting duplicates
      const processedMatchIds = new Set();

      // Process each match
      filteredMatches.forEach(match => {
        // Skip if match ID is already processed (de-duplication)
        const matchId = match.id || match.match_id;
        if (matchId && processedMatchIds.has(matchId)) {
          return; // Skip duplicate match
        }
        if (matchId) {
          processedMatchIds.add(matchId);
        }

        const homeTeamId = match.home_team_id;
        const awayTeamId = match.away_team_id;
        // Strict integer conversion to prevent string concatenation
        const homeScore = Number(match.home_team_score) || 0;
        const awayScore = Number(match.away_team_score) || 0;

        // Get or initialize teams
        if (!teamStatsMap.has(homeTeamId)) {
          const teamInfo = teamInfoMap.get(homeTeamId) || {};
          teamStatsMap.set(homeTeamId, {
            team_id: homeTeamId,
            team_name: match.home_team || teamInfo.team_name || 'Unknown',
            logo_url: match.home_logo_url || teamInfo.logo_url,
            mp: 0,
            w: 0,
            d: 0,
            l: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            pts: 0,
            total_adjustment: teamInfo.total_adjustment || 0,
          });
        }

        if (!teamStatsMap.has(awayTeamId)) {
          const teamInfo = teamInfoMap.get(awayTeamId) || {};
          teamStatsMap.set(awayTeamId, {
            team_id: awayTeamId,
            team_name: match.away_team || teamInfo.team_name || 'Unknown',
            logo_url: match.away_logo_url || teamInfo.logo_url,
            mp: 0,
            w: 0,
            d: 0,
            l: 0,
            gf: 0,
            ga: 0,
            gd: 0,
            pts: 0,
            total_adjustment: teamInfo.total_adjustment || 0,
          });
        }

        const homeTeam = teamStatsMap.get(homeTeamId);
        const awayTeam = teamStatsMap.get(awayTeamId);

        // Update match played (strict integer addition)
        homeTeam.mp = Number(homeTeam.mp) + 1;
        awayTeam.mp = Number(awayTeam.mp) + 1;

        // Update goals (strict integer addition)
        homeTeam.gf = Number(homeTeam.gf) + homeScore;
        homeTeam.ga = Number(homeTeam.ga) + awayScore;
        awayTeam.gf = Number(awayTeam.gf) + awayScore;
        awayTeam.ga = Number(awayTeam.ga) + homeScore;

        // Determine result and assign points (Win = 3, Draw = 1, Loss = 0)
        if (homeScore > awayScore) {
          homeTeam.w = Number(homeTeam.w) + 1;
          homeTeam.pts = Number(homeTeam.pts) + 3; // Win = 3 points
          awayTeam.l = Number(awayTeam.l) + 1;
          // Loss = 0 points (no change)
        } else if (awayScore > homeScore) {
          awayTeam.w = Number(awayTeam.w) + 1;
          awayTeam.pts = Number(awayTeam.pts) + 3; // Win = 3 points
          homeTeam.l = Number(homeTeam.l) + 1;
          // Loss = 0 points (no change)
        } else {
          homeTeam.d = Number(homeTeam.d) + 1;
          homeTeam.pts = Number(homeTeam.pts) + 1; // Draw = 1 point
          awayTeam.d = Number(awayTeam.d) + 1;
          awayTeam.pts = Number(awayTeam.pts) + 1; // Draw = 1 point
        }
      });

      // Calculate goal difference and apply point adjustments (only if targetMW > 0)
      const standingsArray = Array.from(teamStatsMap.values()).map(team => {
        const gf = Number(team.gf) || 0;
        const ga = Number(team.ga) || 0;
        const pts = Number(team.pts) || 0;
        const adjustment = targetMW > 0 ? (Number(team.total_adjustment) || 0) : 0;
        
        return {
          ...team,
          gf,
          ga,
          gd: gf - ga,
          pts: pts + adjustment, // Apply point adjustments only if targetMW > 0
        };
      });

      // Sort by official PL rules: 1. Points, 2. Goal Difference, 3. Goals For
      standingsArray.sort((a, b) => {
        const aPts = Number(a.pts) || 0;
        const bPts = Number(b.pts) || 0;
        const aGD = Number(a.gd) || 0;
        const bGD = Number(b.gd) || 0;
        const aGF = Number(a.gf) || 0;
        const bGF = Number(b.gf) || 0;

        if (bPts !== aPts) return bPts - aPts; // Points (descending)
        if (bGD !== aGD) return bGD - aGD; // Goal Difference (descending)
        return bGF - aGF; // Goals For (descending)
      });

      standingsByMatchweek[targetMW] = standingsArray;
    }

    return standingsByMatchweek;
  }, [matches, standings]);

  // Get base standings by simply indexing into pre-computed array (0ms latency)
  const baseStandings = useMemo(() => {
    return memoizedStandings[selectedMatchweek] || [];
  }, [memoizedStandings, selectedMatchweek]);

  // Find remaining big games (top 5 teams playing each other)
  const remainingBigGames = useMemo(() => {
    if (!matches || matches.length === 0 || !baseStandings || baseStandings.length === 0) {
      return [];
    }

    // Get top 5 teams by current standings
    const top5Teams = baseStandings.slice(0, 5).map(team => team.team_id);
    const top5TeamSet = new Set(top5Teams);

    // Find matches between top 5 teams that haven't been played yet (matchweek > selectedMatchweek)
    const bigGames = matches.filter(match => {
      const matchweek = Number(match.matchweek) || 0;
      const homeId = match.home_team_id;
      const awayId = match.away_team_id;
      
      return matchweek > selectedMatchweek && 
             top5TeamSet.has(homeId) && 
             top5TeamSet.has(awayId);
    });

    return bigGames;
  }, [matches, baseStandings, selectedMatchweek]);

  // Calculate standings with simulated scores
  const simulatedStandings = useMemo(() => {
    if (!isSimulating || !baseStandings || baseStandings.length === 0 || Object.keys(simulatedScores).length === 0) {
      return baseStandings;
    }

    // Create a copy of current standings
    const teamStatsMap = new Map();
    baseStandings.forEach(team => {
      teamStatsMap.set(team.team_id, {
        ...team,
        mp: Number(team.mp) || 0,
        w: Number(team.w) || 0,
        d: Number(team.d) || 0,
        l: Number(team.l) || 0,
        gf: Number(team.gf) || 0,
        ga: Number(team.ga) || 0,
        gd: Number(team.gd) || 0,
        pts: Number(team.pts) || 0,
      });
    });

    // Apply simulated scores to remaining big games
    remainingBigGames.forEach(match => {
      const matchId = match.id || match.match_id;
      const simulated = simulatedScores[matchId];
      
      if (simulated && simulated.homeScore !== '' && simulated.awayScore !== '') {
        const homeScore = Number(simulated.homeScore) || 0;
        const awayScore = Number(simulated.awayScore) || 0;
        const homeTeamId = match.home_team_id;
        const awayTeamId = match.away_team_id;

        const homeTeam = teamStatsMap.get(homeTeamId);
        const awayTeam = teamStatsMap.get(awayTeamId);

        if (homeTeam && awayTeam) {
          // Update match played
          homeTeam.mp = Number(homeTeam.mp) + 1;
          awayTeam.mp = Number(awayTeam.mp) + 1;

          // Update goals
          homeTeam.gf = Number(homeTeam.gf) + homeScore;
          homeTeam.ga = Number(homeTeam.ga) + awayScore;
          awayTeam.gf = Number(awayTeam.gf) + awayScore;
          awayTeam.ga = Number(awayTeam.ga) + homeScore;

          // Update result and points
          if (homeScore > awayScore) {
            homeTeam.w = Number(homeTeam.w) + 1;
            homeTeam.pts = Number(homeTeam.pts) + 3;
            awayTeam.l = Number(awayTeam.l) + 1;
          } else if (awayScore > homeScore) {
            awayTeam.w = Number(awayTeam.w) + 1;
            awayTeam.pts = Number(awayTeam.pts) + 3;
            homeTeam.l = Number(homeTeam.l) + 1;
          } else {
            homeTeam.d = Number(homeTeam.d) + 1;
            homeTeam.pts = Number(homeTeam.pts) + 1;
            awayTeam.d = Number(awayTeam.d) + 1;
            awayTeam.pts = Number(awayTeam.pts) + 1;
          }

          // Update goal difference
          homeTeam.gd = Number(homeTeam.gf) - Number(homeTeam.ga);
          awayTeam.gd = Number(awayTeam.gf) - Number(awayTeam.ga);
        }
      }
    });

    // Convert to array and sort
    const standingsArray = Array.from(teamStatsMap.values());
    standingsArray.sort((a, b) => {
      const aPts = Number(a.pts) || 0;
      const bPts = Number(b.pts) || 0;
      const aGD = Number(a.gd) || 0;
      const bGD = Number(b.gd) || 0;
      const aGF = Number(a.gf) || 0;
      const bGF = Number(b.gf) || 0;

      if (bPts !== aPts) return bPts - aPts;
      if (bGD !== aGD) return bGD - aGD;
      return bGF - aGF;
    });

    return standingsArray;
  }, [isSimulating, baseStandings, simulatedScores, remainingBigGames]);

  // Get current standings - use simulated if in simulation mode
  const calculatedStandings = useMemo(() => {
    return isSimulating ? simulatedStandings : baseStandings;
  }, [isSimulating, baseStandings, simulatedStandings]);

  // Check if a team mathematically wins the league
  const getTitleWinners = useMemo(() => {
    if (!isSimulating || !calculatedStandings || calculatedStandings.length === 0) {
      return new Set();
    }

    // Check if all simulated scores are filled
    const allScoresFilled = remainingBigGames.length > 0 && remainingBigGames.every(match => {
      const matchId = match.id || match.match_id;
      const simulated = simulatedScores[matchId];
      return simulated && simulated.homeScore !== '' && simulated.awayScore !== '';
    });

    if (!allScoresFilled) {
      return new Set();
    }

    const winners = new Set();
    const leader = calculatedStandings[0];
    if (!leader) return winners;

    const leaderPoints = Number(leader.pts) || 0;
    
    // Calculate remaining games per team (only from remaining big games)
    const remainingGamesPerTeam = new Map();
    remainingBigGames.forEach(match => {
      const homeId = match.home_team_id;
      const awayId = match.away_team_id;
      remainingGamesPerTeam.set(homeId, (remainingGamesPerTeam.get(homeId) || 0) + 1);
      remainingGamesPerTeam.set(awayId, (remainingGamesPerTeam.get(awayId) || 0) + 1);
    });

    // Check if leader can't be caught by any other team
    let leaderHasWon = true;
    for (let i = 1; i < calculatedStandings.length; i++) {
      const team = calculatedStandings[i];
      const teamPoints = Number(team.pts) || 0;
      const remainingGames = remainingGamesPerTeam.get(team.team_id) || 0;
      const maxPossiblePoints = teamPoints + (remainingGames * 3);
      
      if (maxPossiblePoints >= leaderPoints) {
        // This team can still catch or tie the leader
        leaderHasWon = false;
        break;
      }
    }

    if (leaderHasWon) {
      winners.add(leader.team_id);
    }

    return winners;
  }, [isSimulating, calculatedStandings, remainingBigGames, simulatedScores]);

  // Handle score input change
  const handleScoreChange = (matchId, teamType, value) => {
    setSimulatedScores(prev => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] || {}),
        [teamType]: value || '',
      },
    }));
  };

  // Calculate position changes and projected points
  const positionChanges = useMemo(() => {
    if (!isSimulating || !baseStandings || !calculatedStandings) {
      return new Map();
    }

    const changes = new Map();
    const basePositions = new Map();
    baseStandings.forEach((team, index) => {
      basePositions.set(team.team_id, index + 1);
    });

    calculatedStandings.forEach((team, index) => {
      const newPosition = index + 1;
      const oldPosition = basePositions.get(team.team_id) || newPosition;
      const change = oldPosition - newPosition; // Positive = moved up, Negative = moved down
      changes.set(team.team_id, change);
    });

    return changes;
  }, [isSimulating, baseStandings, calculatedStandings]);

  // Reset simulated scores with animation
  const handleResetSimulation = () => {
    setSimulatedScores({});
    setIsSimulating(false);
  };

  // Handle play/pause for season replay
  const handlePlayPause = () => {
    if (isPlaying) {
      // Pause
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // Play
      setIsPlaying(true);
      playIntervalRef.current = setInterval(() => {
        setSelectedMatchweek(prev => {
          if (prev >= 38) {
            // Stop at matchweek 38
            if (playIntervalRef.current) {
              clearInterval(playIntervalRef.current);
              playIntervalRef.current = null;
            }
            setIsPlaying(false);
            return 38;
          }
          if (prev < 0) {
            return 0; // Ensure we don't go below 0
          }
          return prev + 1;
        });
      }, 500);
    }
  };

  const sortedStandings = [...calculatedStandings].sort((a, b) => {
    if (sortConfig.key === 'team_name') {
      const aName = (a.team_name || '').toString();
      const bName = (b.team_name || '').toString();
      return sortConfig.direction === 'asc'
        ? aName.localeCompare(bName)
        : bName.localeCompare(aName);
    }
    const aVal = a[sortConfig.key] != null ? Number(a[sortConfig.key]) : 0;
    const bVal = b[sortConfig.key] != null ? Number(b[sortConfig.key]) : 0;
    
    // Primary sort by selected column
    if (aVal !== bVal) {
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    // Secondary sort: When sorting by points, also sort by goal difference, then goals scored
    if (sortConfig.key === 'pts') {
      const aGD = a.gd != null ? Number(a.gd) : 0;
      const bGD = b.gd != null ? Number(b.gd) : 0;
      if (aGD !== bGD) {
        return bGD - aGD; // Higher goal difference first
      }
      // Tertiary sort by goals scored
      const aGF = a.gf != null ? Number(a.gf) : 0;
      const bGF = b.gf != null ? Number(b.gf) : 0;
      return bGF - aGF; // More goals scored first
    }
    
    return 0;
  });

  // Calculate form (last 5 matches) for each team - memoized for performance
  const teamFormData = useMemo(() => {
    if (!matches || matches.length === 0 || !calculatedStandings || calculatedStandings.length === 0) {
      return {};
    }

    const formMap = {};

    calculatedStandings.forEach(team => {
      const teamId = team.team_id;
      
      // Filter matches where team is home or away and within selected matchweek
      const teamMatches = matches.filter(match => {
        const matchweek = match.matchweek || 0;
        return (match.home_team_id === teamId || match.away_team_id === teamId) &&
               matchweek > 0 && matchweek <= selectedMatchweek;
      });

      // Sort by date descending (newest first) and take first 5
      const last5Matches = teamMatches
        .sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB - dateA; // Descending (newest first)
        })
        .slice(0, 5)
        .reverse(); // Reverse to show oldest to newest (left to right)

      // Process each match to determine result and create tooltip (following ClubDetail.jsx logic)
      const formResults = last5Matches.map(match => {
        const isHome = match.home_team_id === teamId;
        const teamScore = isHome ? parseInt(match.home_team_score || 0, 10) : parseInt(match.away_team_score || 0, 10);
        const opponentScore = isHome ? parseInt(match.away_team_score || 0, 10) : parseInt(match.home_team_score || 0, 10);
        const opponentName = isHome ? match.away_team : match.home_team;
        const matchDate = new Date(match.date);

        let result;
        if (teamScore > opponentScore) {
          result = 'W';
        } else if (teamScore === opponentScore) {
          result = 'D';
        } else {
          result = 'L';
        }

        // Format date nicely (e.g., "Aug 12") - following ClubDetail.jsx format
        const formattedDate = matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Create tooltip text: "${isHome ? 'vs' : 'at'} ${opponentName} (${teamScore}-${opponentScore}) - ${formattedDate}"
        // This matches the exact format used in ClubDetail.jsx
        const tooltip = `${isHome ? 'vs' : 'at'} ${opponentName} (${teamScore}-${opponentScore}) - ${formattedDate}`;

        return {
          result,
          tooltip,
          teamScore,
          opponentScore,
          opponentName,
          isHome,
          date: matchDate
        };
      });

      formMap[teamId] = formResults;
    });

    return formMap;
  }, [matches, calculatedStandings, selectedMatchweek]);

  // Form badge component with custom tooltip (matching ClubDetail.jsx design)
  const FormBadge = ({ result, tooltip }) => {
    const getBadgeClasses = () => {
      switch (result) {
        case 'W':
          return 'bg-emerald-500 text-white';
        case 'D':
          return 'bg-slate-400 text-white';
        case 'L':
          return 'bg-rose-500 text-white';
        default:
          return 'bg-gray-400 text-white';
      }
    };

    return (
      <div className="relative group">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getBadgeClasses()} cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg`}
        >
          {result}
        </div>
        {/* Custom tooltip matching ClubDetail.jsx design */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    );
  };

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

  // Filter matches up to selected matchweek for stats
  const filteredMatchesForStats = useMemo(() => {
    return matches.filter(m => {
      const mw = m.matchweek || 0;
      return mw > 0 && mw <= selectedMatchweek;
    });
  }, [matches, selectedMatchweek]);

  // Count matches processed for current matchweek
  const matchesProcessed = filteredMatchesForStats.length;

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
  // 1. Total goals from matches up to selected matchweek
  const totalGoals = filteredMatchesForStats.reduce((sum, match) => {
    const homeGoals = parseInt(match.home_team_score || 0, 10);
    const awayGoals = parseInt(match.away_team_score || 0, 10);
    return sum + homeGoals + awayGoals;
  }, 0);

  // 2. Match with highest attendance
  const highestAttendanceMatch = filteredMatchesForStats.length > 0
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
      }, filteredMatchesForStats[0])
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
    const manCityMatches = filteredMatchesForStats
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
      className={`space-y-8 transition-all duration-500 ${
        isSimulating ? 'bg-[#00FF85]/5' : ''
      }`}
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
        className={`bg-white dark:bg-neutral-800 rounded-xl shadow-lg overflow-hidden relative transition-all duration-500 ${
          isSimulating ? 'border-2 border-[#00FF85] shadow-[0_0_30px_rgba(0,255,133,0.3)]' : ''
        }`}
      >
        {/* Large Background "WEEK [X]" Display */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
          <motion.div
            key={selectedMatchweek}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 0.08, scale: 1 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
            className="text-[18rem] font-black text-[#00FF85] select-none tracking-tighter"
            style={{ 
              fontFamily: 'system-ui, -apple-system, sans-serif',
              textShadow: '0 0 40px rgba(0, 255, 133, 0.3)',
            }}
          >
            WEEK {selectedMatchweek}
          </motion.div>
        </div>

        {/* Premium Tactical Command Control Bar */}
        <div className="relative z-10 px-8 py-6 bg-gradient-to-r from-[#38003C]/90 via-[#1a0033]/90 to-[#38003C]/90 backdrop-blur-xl border-b-2 border-[#00FF85]/30 shadow-2xl">
          <div className="flex flex-col space-y-5">
            {/* Title Race Simulator Toggle */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-4">
                <label className="relative inline-flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isSimulating}
                    onChange={(e) => setIsSimulating(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="relative w-20 h-10 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00FF85]/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-9 after:w-9 after:transition-all peer-checked:bg-[#00FF85] shadow-lg shadow-[#00FF85]/50 peer-checked:shadow-[0_0_20px_rgba(0,255,133,0.8)]">
                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs font-black text-white opacity-0 peer-checked:opacity-100 transition-opacity">
                      ON
                    </span>
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-black text-white opacity-100 peer-checked:opacity-0 transition-opacity">
                      OFF
                    </span>
                  </div>
                  <span className="ml-4 text-xl font-black text-white tracking-tight flex items-center space-x-2">
                    <FaTrophy className={`text-2xl transition-all duration-300 ${isSimulating ? 'text-[#00FF85] animate-pulse' : 'text-white/60'}`} style={isSimulating ? { filter: 'drop-shadow(0 0 10px rgba(0, 255, 133, 0.8))' } : {}} />
                    <span className={isSimulating ? 'text-[#00FF85]' : 'text-white'}>TITLE RACE SIMULATOR</span>
                  </span>
                </label>
              </div>
              {isSimulating && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleResetSimulation}
                  className="group flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-red-500/70 hover:scale-105 active:scale-95 border-2 border-red-400"
                  style={{
                    boxShadow: '0 0 20px rgba(239, 68, 68, 0.6), 0 0 40px rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <span className="text-sm tracking-wider">ABANDON SIMULATION</span>
                </motion.button>
              )}
            </div>

            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-[#00FF85]/20 flex items-center justify-center border border-[#00FF85]/40">
                  <FaTrophy className="text-[#00FF85] text-lg" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">TACTICAL COMMAND</h2>
                  <p className="text-xs text-white/60 font-medium">Standings Time Machine</p>
                </div>
              </div>
              <button
                onClick={handlePlayPause}
                className="group flex items-center space-x-2 px-6 py-3 bg-[#00FF85] hover:bg-[#00CC6A] text-[#0a0a0a] font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-[#00FF85]/50 hover:scale-105 active:scale-95"
              >
                {isPlaying ? (
                  <>
                    <FaPause className="text-lg" />
                    <span>PAUSE</span>
                  </>
                ) : (
                  <>
                    <FaPlay className="text-lg" />
                    <span>PLAY</span>
                  </>
                )}
              </button>
            </div>

            {/* Slider Row */}
            <div className="flex items-center space-x-6">
              {/* Matchweek Label */}
              <div className="flex flex-col min-w-[140px]">
                <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Matchweek</span>
                <span className="text-3xl font-black text-[#00FF85] tracking-tight">{selectedMatchweek}</span>
              </div>

              {/* Custom Neon Slider */}
              <div className="flex-1 relative">
                 <Slider
                   min={0}
                   max={38}
                   value={selectedMatchweek}
                  onChange={(value) => {
                    setSelectedMatchweek(value);
                    if (isPlaying) {
                      handlePlayPause(); // Stop playing when manually adjusting
                    }
                  }}
                  marks={{
                    1: { style: { color: '#00FF85', fontSize: '12px', fontWeight: 'bold' }, label: '1' },
                    10: { style: { color: '#00FF85', fontSize: '12px', fontWeight: 'bold' }, label: '10' },
                    20: { style: { color: '#00FF85', fontSize: '12px', fontWeight: 'bold' }, label: '20' },
                    30: { style: { color: '#00FF85', fontSize: '12px', fontWeight: 'bold' }, label: '30' },
                    38: { style: { color: '#00FF85', fontSize: '12px', fontWeight: 'bold' }, label: '38' },
                  }}
                  trackStyle={{ 
                    backgroundColor: '#00FF85', 
                    height: 8,
                    boxShadow: '0 0 10px rgba(0, 255, 133, 0.5)',
                  }}
                  handleStyle={{
                    borderColor: '#00FF85',
                    backgroundColor: '#00FF85',
                    width: 24,
                    height: 24,
                    marginTop: -8,
                    marginLeft: -12,
                    boxShadow: '0 0 15px rgba(0, 255, 133, 0.8), 0 0 30px rgba(0, 255, 133, 0.4)',
                    borderWidth: 3,
                    borderStyle: 'solid',
                  }}
                  railStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.15)', 
                    height: 8,
                    borderRadius: 4,
                  }}
                  dotStyle={{ 
                    borderColor: 'rgba(0, 255, 133, 0.4)', 
                    backgroundColor: 'rgba(0, 255, 133, 0.1)',
                    width: 8,
                    height: 8,
                    marginTop: -2,
                  }}
                  activeDotStyle={{ 
                    borderColor: '#00FF85', 
                    backgroundColor: '#00FF85',
                    width: 10,
                    height: 10,
                    marginTop: -3,
                    boxShadow: '0 0 8px rgba(0, 255, 133, 0.6)',
                  }}
                />
              </div>

              {/* Stats Context */}
              <div className="flex flex-col items-end min-w-[160px]">
                <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Matches Processed</span>
                <span className="text-xl font-black text-white tracking-tight">
                  <span className="text-[#00FF85]">{matchesProcessed}</span>
                  <span className="text-white/40">/380</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Simulated Fixtures Panel */}
        {isSimulating && remainingBigGames.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 px-8 py-6 bg-white/5 backdrop-blur-xl border-b-2 border-[#00FF85]/40"
          >
            <div className="mb-6 pb-4 border-b border-white/10">
              <h3 className="text-2xl font-black text-[#00FF85] tracking-tight mb-1 flex items-center space-x-2">
                <FaTrophy className="text-[#00FF85]" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 255, 133, 0.8))' }} />
                <span>SIMULATED FIXTURES</span>
              </h3>
              <p className="text-sm text-white/60 font-mono">Enter scores to project final standings</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {remainingBigGames.map((match) => {
                const matchId = match.id || match.match_id;
                const simulated = simulatedScores[matchId] || {};
                const homeScore = simulated.homeScore ?? '';
                const awayScore = simulated.awayScore ?? '';
                const homeTeam = baseStandings.find(t => t.team_id === match.home_team_id);
                const awayTeam = baseStandings.find(t => t.team_id === match.away_team_id);
                const hasPrediction = homeScore !== '' || awayScore !== '';
                
                return (
                  <motion.div
                    key={matchId}
                    layout
                    className={`bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-[#00FF85]/40 transition-all relative ${
                      hasPrediction ? 'shadow-[0_0_15px_rgba(0,255,133,0.15)] border-[#00FF85]/30' : ''
                    }`}
                  >
                    {/* Horizontal Layout: [Logo A] [Score A] [VS + MW] [Score B] [Logo B] */}
                    <div className="flex items-center justify-between w-full gap-3">
                      {/* Home Team Logo */}
                      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                        <TeamLogo
                          logoUrl={homeTeam?.logo_url}
                          teamName={homeTeam?.team_name}
                          className="h-8 w-8 rounded-full"
                          style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))' }}
                        />
                      </div>

                      {/* Home Score Input */}
                      <input
                        type="number"
                        min="0"
                        value={homeScore}
                        onChange={(e) => handleScoreChange(matchId, 'homeScore', e.target.value)}
                        placeholder="0"
                        className="w-12 h-10 bg-black/40 border border-white/20 rounded-lg text-center text-xl font-mono text-white focus:border-[#00FF85] outline-none transition-all"
                      />

                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className="text-[15px] font-bold text-[#00FF85] uppercase tracking-widest bg-[#00FF85]/10 px-5 py-1 rounded">
                          MW {match.matchweek}
                        </span>
                      </div>

                      {/* Away Score Input */}
                      <input
                        type="number"
                        min="0"
                        value={awayScore}
                        onChange={(e) => handleScoreChange(matchId, 'awayScore', e.target.value)}
                        placeholder="0"
                        className="w-12 h-10 bg-black/40 border border-white/20 rounded-lg text-center text-xl font-mono text-white focus:border-[#00FF85] outline-none transition-all"
                      />

                      {/* Away Team Logo */}
                      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                        <TeamLogo
                          logoUrl={awayTeam?.logo_url}
                          teamName={awayTeam?.team_name}
                          className="h-8 w-8 rounded-full"
                          style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))' }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Qualification Legend */}
        <div className="relative z-10 px-6 py-4 bg-gray-50 dark:bg-neutral-700/50 border-b border-gray-200 dark:border-neutral-700">
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
        
        <div className="relative z-10 overflow-x-auto">
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
                {isSimulating && (
                  <th className="px-6 py-3 text-center text-xs font-heading font-semibold uppercase tracking-wider text-[#00FF85]">
                    Projected Pts
                  </th>
                )}
                <th className="px-6 py-3 text-center text-xs font-heading font-semibold uppercase tracking-wider text-white">
                  Form
                </th>
              </tr>
            </thead>
            <tbody className="relative z-10 bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-700">
              <AnimatePresence mode="popLayout">
                {sortedStandings.map((team, index) => {
                  const position = index + 1;
                  const statusColor = getStatusColor(position, team.team_name);
                  
                  return (
                    <motion.tr
                      key={team.team_id}
                      layout
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      variants={rowVariants}
                      transition={{
                        layout: { duration: 0.4, type: "spring", stiffness: 300, damping: 30 },
                      }}
                      className={`
                        ${index % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-gray-50/80 dark:bg-neutral-800/80'}
                        hover:bg-gray-100 dark:hover:bg-neutral-700
                        transition-all duration-300
                        border-l-4
                        ${isSimulating && position === 1 && getTitleWinners.has(team.team_id) ? 'animate-pulse' : ''}
                      `}
                      style={{
                        borderLeftColor: statusColor,
                        ...(isSimulating && position === 1 && getTitleWinners.has(team.team_id) ? {
                          boxShadow: '0 0 20px rgba(255, 215, 0, 0.4)',
                        } : {}),
                      }}
                      whileHover={{ scale: 1.01, x: 4 }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <span>{index + 1}</span>
                          {isSimulating && positionChanges.has(team.team_id) && (() => {
                            const change = positionChanges.get(team.team_id);
                            if (change > 0) {
                              return (
                                <span className="flex items-center text-emerald-500 font-bold text-xs">
                                  <FaArrowUp className="mr-1" />
                                  {change}
                                </span>
                              );
                            }
                            if (change < 0) {
                              return (
                                <span className="flex items-center text-rose-500 font-bold text-xs">
                                  <FaArrowDown className="mr-1" />
                                  {Math.abs(change)}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        <Link 
                          to={`/teams/${team.team_id}`}
                          className="flex items-center space-x-3 hover:text-primary dark:hover:text-accent transition-colors"
                        >
                          <TeamLogo 
                            logoUrl={team.logo_url} 
                            teamName={team.team_name}
                            className="w-8 h-8 rounded-full"
                          />
                          <span className="hover:underline flex items-center space-x-2">
                            <span>{team.team_name}</span>
                            {getTitleWinners.has(team.team_id) && (
                              <FaCrown 
                                className="text-yellow-400"
                                style={{
                                  filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8)) drop-shadow(0 0 16px rgba(255, 215, 0, 0.6))',
                                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                                }}
                              />
                            )}
                            {team.total_adjustment && team.total_adjustment < 0 && (
                              <span className="ml-2 text-[#D8195B] font-semibold">
                                ({team.total_adjustment})
                              </span>
                            )}
                          </span>
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
                      <td 
                        className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-center ${
                          team.total_adjustment && team.total_adjustment < 0
                            ? 'text-[#D8195B]'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {team.pts}
                      </td>
                      {isSimulating && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-center font-mono text-[#00FF85]">
                          {team.pts}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex gap-1 justify-center items-center">
                          {teamFormData[team.team_id] && teamFormData[team.team_id].length > 0 ? (
                            teamFormData[team.team_id].map((formMatch, idx) => (
                              <FormBadge
                                key={idx}
                                result={formMatch.result}
                                tooltip={formMatch.tooltip}
                              />
                            ))
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {/* Footer Note */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-700/50 border-t border-gray-200 dark:border-neutral-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 italic">
            * Points deducted by the Premier League for Profit and Sustainability Rule (PSR) breaches.
          </p>
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
            </div>

            {showGDChart && (
              <div className="mt-6">
                <GoalDifferenceChart standings={sortedStandings} />
              </div>
            )}

          </motion.div>
        </motion.div>
      )}

    </motion.div>
  );
};

export default Standings;
