import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaTimes, FaSpinner, FaFutbol, FaHandPaper, FaChartLine, FaStar, FaTrash } from 'react-icons/fa';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from 'recharts';
import TeamLogo from '../components/TeamLogo';

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
  'default': '#38003C' // EPL Purple
};

const PlayerComparison = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [playerA, setPlayerA] = useState(null);
  const [playerB, setPlayerB] = useState(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [errorA, setErrorA] = useState(null);
  const [errorB, setErrorB] = useState(null);

  // Search states for Player A
  const [queryA, setQueryA] = useState('');
  const [resultsA, setResultsA] = useState({ players: [], teams: [] });
  const [isOpenA, setIsOpenA] = useState(false);
  const [selectedIndexA, setSelectedIndexA] = useState(-1);
  const [loadingSearchA, setLoadingSearchA] = useState(false);
  const inputRefA = useRef(null);
  const dropdownRefA = useRef(null);
  const debounceTimerRefA = useRef(null);

  // Search states for Player B
  const [queryB, setQueryB] = useState('');
  const [resultsB, setResultsB] = useState({ players: [], teams: [] });
  const [isOpenB, setIsOpenB] = useState(false);
  const [selectedIndexB, setSelectedIndexB] = useState(-1);
  const [loadingSearchB, setLoadingSearchB] = useState(false);
  const inputRefB = useRef(null);
  const dropdownRefB = useRef(null);
  const debounceTimerRefB = useRef(null);

  // Get team colors
  const teamColorA = useMemo(() => {
    if (!playerA) return TEAM_THEMES.default;
    return TEAM_THEMES[playerA.team_name] || TEAM_THEMES.default;
  }, [playerA]);

  const teamColorB = useMemo(() => {
    if (!playerB) return TEAM_THEMES.default;
    return TEAM_THEMES[playerB.team_name] || TEAM_THEMES.default;
  }, [playerB]);

  // Debounced search function for Player A
  const performSearchA = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResultsA({ players: [], teams: [] });
      setIsOpenA(false);
      return;
    }

    setLoadingSearchA(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=5`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setResultsA(data.data || { players: [], teams: [] });
      setIsOpenA(true);
      setSelectedIndexA(-1);
    } catch (error) {
      console.error('Search error:', error);
      setResultsA({ players: [], teams: [] });
    } finally {
      setLoadingSearchA(false);
    }
  }, []);

  // Debounced search function for Player B
  const performSearchB = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResultsB({ players: [], teams: [] });
      setIsOpenB(false);
      return;
    }

    setLoadingSearchB(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=5`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setResultsB(data.data || { players: [], teams: [] });
      setIsOpenB(true);
      setSelectedIndexB(-1);
    } catch (error) {
      console.error('Search error:', error);
      setResultsB({ players: [], teams: [] });
    } finally {
      setLoadingSearchB(false);
    }
  }, []);

  // Handle input change with debouncing for Player A
  useEffect(() => {
    if (debounceTimerRefA.current) {
      clearTimeout(debounceTimerRefA.current);
    }

    debounceTimerRefA.current = setTimeout(() => {
      performSearchA(queryA);
    }, 300);

    return () => {
      if (debounceTimerRefA.current) {
        clearTimeout(debounceTimerRefA.current);
      }
    };
  }, [queryA, performSearchA]);

  // Handle input change with debouncing for Player B
  useEffect(() => {
    if (debounceTimerRefB.current) {
      clearTimeout(debounceTimerRefB.current);
    }

    debounceTimerRefB.current = setTimeout(() => {
      performSearchB(queryB);
    }, 300);

    return () => {
      if (debounceTimerRefB.current) {
        clearTimeout(debounceTimerRefB.current);
      }
    };
  }, [queryB, performSearchB]);

  // Fetch player data when selected
  const fetchPlayerData = async (playerId, setPlayer, setLoading, setError, setQuery = null) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/players/${playerId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch player data');
      }
      const data = await response.json();
      setPlayer(data.data);
      if (setQuery) {
        setQuery(data.data.player_name);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load players from URL params on mount
  useEffect(() => {
    const playerAId = searchParams.get('playerA');
    const playerBId = searchParams.get('playerB');

    if (playerAId) {
      fetchPlayerData(playerAId, setPlayerA, setLoadingA, setErrorA, setQueryA);
    }
    if (playerBId) {
      fetchPlayerData(playerBId, setPlayerB, setLoadingB, setErrorB, setQueryB);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle selection for Player A
  const handleSelectA = (item) => {
    if (item.type === 'player') {
      setQueryA(item.name);
      setIsOpenA(false);
      fetchPlayerData(item.id, setPlayerA, setLoadingA, setErrorA);
      // Update URL params
      const playerBId = searchParams.get('playerB');
      const newParams = { playerA: item.id };
      if (playerBId) newParams.playerB = playerBId;
      setSearchParams(newParams);
    }
  };

  // Handle selection for Player B
  const handleSelectB = (item) => {
    if (item.type === 'player') {
      setQueryB(item.name);
      setIsOpenB(false);
      fetchPlayerData(item.id, setPlayerB, setLoadingB, setErrorB);
      // Update URL params
      const playerAId = searchParams.get('playerA');
      const newParams = { playerB: item.id };
      if (playerAId) newParams.playerA = playerAId;
      setSearchParams(newParams);
    }
  };

  // Clear comparison
  const clearComparison = () => {
    setPlayerA(null);
    setPlayerB(null);
    setQueryA('');
    setQueryB('');
    setResultsA({ players: [], teams: [] });
    setResultsB({ players: [], teams: [] });
    setErrorA(null);
    setErrorB(null);
    setSearchParams({});
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRefA.current &&
        !dropdownRefA.current.contains(event.target) &&
        inputRefA.current &&
        !inputRefA.current.contains(event.target)
      ) {
        setIsOpenA(false);
      }
      if (
        dropdownRefB.current &&
        !dropdownRefB.current.contains(event.target) &&
        inputRefB.current &&
        !inputRefB.current.contains(event.target)
      ) {
        setIsOpenB(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get all results as flat arrays for keyboard navigation
  const allResultsA = [
    ...resultsA.teams.map((team, idx) => ({ ...team, category: 'team', flatIndex: idx })),
    ...resultsA.players.map((player, idx) => ({ ...player, category: 'player', flatIndex: idx }))
  ];

  const allResultsB = [
    ...resultsB.teams.map((team, idx) => ({ ...team, category: 'team', flatIndex: idx })),
    ...resultsB.players.map((player, idx) => ({ ...player, category: 'player', flatIndex: idx }))
  ];

  // Handle keyboard navigation for Player A
  const handleKeyDownA = (e) => {
    if (!isOpenA || allResultsA.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndexA((prev) => 
          prev < allResultsA.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndexA((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndexA >= 0 && selectedIndexA < allResultsA.length) {
          handleSelectA(allResultsA[selectedIndexA]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpenA(false);
        break;
      default:
        break;
    }
  };

  // Handle keyboard navigation for Player B
  const handleKeyDownB = (e) => {
    if (!isOpenB || allResultsB.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndexB((prev) => 
          prev < allResultsB.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndexB((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndexB >= 0 && selectedIndexB < allResultsB.length) {
          handleSelectB(allResultsB[selectedIndexB]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpenB(false);
        break;
      default:
        break;
    }
  };

  // Prepare stats for comparison
  const statsToCompare = [
    { key: 'goals', label: 'Goals', icon: FaFutbol, format: (val) => val != null ? val : 'N/A' },
    { key: 'assists', label: 'Assists', icon: FaHandPaper, format: (val) => val != null ? val : 'N/A' },
    { key: 'xg', label: 'Expected Goals', icon: FaChartLine, format: (val) => val != null ? Number(val).toFixed(2) : 'N/A' },
    { key: 'xag', label: 'Expected Assists', icon: FaChartLine, format: (val) => val != null ? Number(val).toFixed(2) : 'N/A' },
    { key: 'sofascore_rating', label: 'Rating', icon: FaStar, format: (val) => val != null ? Number(val).toFixed(1) : 'N/A' },
    { key: 'progressive_passes', label: 'Progressive Passes', icon: FaChartLine, format: (val) => val != null ? val : 'N/A' },
    { key: 'appearances', label: 'Appearances', icon: FaFutbol, format: (val) => val != null ? val : 'N/A' },
    { key: 'minutes_played', label: 'Minutes Played', icon: FaFutbol, format: (val) => val != null ? val.toLocaleString() : 'N/A' },
  ];

  // Helper function to compare values and determine winner
  const getWinner = (valA, valB) => {
    if (valA == null || valB == null) return null;
    const numA = Number(valA);
    const numB = Number(valB);
    if (isNaN(numA) || isNaN(numB)) return null;
    if (numA > numB) return 'A';
    if (numB > numA) return 'B';
    return 'tie';
  };

  // Calculate progress bar percentages
  const getProgressPercentage = (valA, valB) => {
    if (valA == null || valB == null) return { left: 50, right: 50 };
    const numA = Number(valA) || 0;
    const numB = Number(valB) || 0;
    const total = numA + numB;
    if (total === 0) return { left: 50, right: 50 };
    return {
      left: (numA / total) * 100,
      right: (numB / total) * 100
    };
  };

  // Prepare radar chart data
  const radarChartData = playerA && playerB ? (() => {
    const maxValues = {
      goals: 30,
      assists: 15,
      xg: 20,
      progressive_passes: 200,
      rating: 10
    };

    const normalize = (value, max) => {
      if (!max || max === 0) return 0;
      return Math.min((value / max) * 100, 100);
    };

    const getValue = (player, key) => Number(player[key]) || 0;

    return [
      {
        subject: 'Goals',
        playerA: normalize(getValue(playerA, 'goals'), maxValues.goals),
        playerB: normalize(getValue(playerB, 'goals'), maxValues.goals),
        fullMark: 100
      },
      {
        subject: 'Assists',
        playerA: normalize(getValue(playerA, 'assists'), maxValues.assists),
        playerB: normalize(getValue(playerB, 'assists'), maxValues.assists),
        fullMark: 100
      },
      {
        subject: 'xG',
        playerA: normalize(getValue(playerA, 'xg'), maxValues.xg),
        playerB: normalize(getValue(playerB, 'xg'), maxValues.xg),
        fullMark: 100
      },
      {
        subject: 'Prog. Passes',
        playerA: normalize(getValue(playerA, 'progressive_passes'), maxValues.progressive_passes),
        playerB: normalize(getValue(playerB, 'progressive_passes'), maxValues.progressive_passes),
        fullMark: 100
      },
      {
        subject: 'Rating',
        playerA: normalize(getValue(playerA, 'sofascore_rating'), maxValues.rating),
        playerB: normalize(getValue(playerB, 'sofascore_rating'), maxValues.rating),
        fullMark: 100
      }
    ];
  })() : [];

  const hasResultsA = resultsA.players.length > 0 || resultsA.teams.length > 0;
  const showDropdownA = isOpenA && (loadingSearchA || hasResultsA);

  const hasResultsB = resultsB.players.length > 0 || resultsB.teams.length > 0;
  const showDropdownB = isOpenB && (loadingSearchB || hasResultsB);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player A Search */}
            <div className="relative">
              <label className="block text-white/80 font-semibold mb-2 text-sm">Player A</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                <input
                  ref={inputRefA}
                  type="text"
                  placeholder="Search for player..."
                  value={queryA}
                  onChange={(e) => setQueryA(e.target.value)}
                  onFocus={() => {
                    if (queryA.trim().length >= 2) {
                      setIsOpenA(true);
                    }
                  }}
                  onKeyDown={handleKeyDownA}
                  className="w-full pl-10 pr-10 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00FF85] focus:border-[#00FF85] transition-all duration-300"
                />
                {queryA && (
                  <button
                    onClick={() => {
                      setQueryA('');
                      setResultsA({ players: [], teams: [] });
                      setIsOpenA(false);
                      setPlayerA(null);
                      setErrorA(null);
                      inputRefA.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                    aria-label="Clear search"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>

              {/* Dropdown for Player A */}
              <AnimatePresence>
                {showDropdownA && (
                  <motion.div
                    ref={dropdownRefA}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a]/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50"
                  >
                    {loadingSearchA ? (
                      <div className="p-4 text-center text-white/60">
                        <FaSpinner className="animate-spin mx-auto mb-2" />
                        <p>Searching...</p>
                      </div>
                    ) : hasResultsA ? (
                      <div>
                        {resultsA.players.length > 0 && (
                          <div>
                            <div className="px-4 py-2 bg-white/5 text-xs font-semibold text-white/60 uppercase tracking-wider">
                              Players ({resultsA.players.length})
                            </div>
                            {resultsA.players.map((player, idx) => {
                              const flatIdx = resultsA.teams.length + idx;
                              return (
                                <button
                                  key={player.id}
                                  data-index={flatIdx}
                                  onClick={() => handleSelectA(player)}
                                  className={`w-full px-4 py-3 flex items-center space-x-3 hover:bg-white/5 transition-colors ${
                                    selectedIndexA === flatIdx
                                      ? 'bg-[#00FF85]/10'
                                      : ''
                                  }`}
                                >
                                  <TeamLogo
                                    logoUrl={player.logo_url}
                                    teamName={player.team_name}
                                    className="w-8 h-8 object-contain flex-shrink-0"
                                  />
                                  <div className="flex-1 text-left">
                                    <div className="text-sm font-medium text-white">
                                      {player.name}
                                    </div>
                                    <div className="text-xs text-white/50">
                                      {player.position} • {player.team_name}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>

              {loadingA && (
                <div className="mt-4 flex items-center justify-center p-4 bg-white/5 rounded-lg">
                  <FaSpinner className="animate-spin text-[#00FF85] mr-2" />
                  <span className="text-white/80">Loading player data...</span>
                </div>
              )}
              {errorA && (
                <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
                  {errorA}
                </div>
              )}
            </div>

            {/* Player B Search */}
            <div className="relative">
              <label className="block text-white/80 font-semibold mb-2 text-sm">Player B</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
                <input
                  ref={inputRefB}
                  type="text"
                  placeholder="Search for player..."
                  value={queryB}
                  onChange={(e) => setQueryB(e.target.value)}
                  onFocus={() => {
                    if (queryB.trim().length >= 2) {
                      setIsOpenB(true);
                    }
                  }}
                  onKeyDown={handleKeyDownB}
                  className="w-full pl-10 pr-10 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00FF85] focus:border-[#00FF85] transition-all duration-300"
                />
                {queryB && (
                  <button
                    onClick={() => {
                      setQueryB('');
                      setResultsB({ players: [], teams: [] });
                      setIsOpenB(false);
                      setPlayerB(null);
                      setErrorB(null);
                      inputRefB.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                    aria-label="Clear search"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>

              {/* Dropdown for Player B */}
              <AnimatePresence>
                {showDropdownB && (
                  <motion.div
                    ref={dropdownRefB}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-[#0a0a0a]/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50"
                  >
                    {loadingSearchB ? (
                      <div className="p-4 text-center text-white/60">
                        <FaSpinner className="animate-spin mx-auto mb-2" />
                        <p>Searching...</p>
                      </div>
                    ) : hasResultsB ? (
                      <div>
                        {resultsB.players.length > 0 && (
                          <div>
                            <div className="px-4 py-2 bg-white/5 text-xs font-semibold text-white/60 uppercase tracking-wider">
                              Players ({resultsB.players.length})
                            </div>
                            {resultsB.players.map((player, idx) => {
                              const flatIdx = resultsB.teams.length + idx;
                              return (
                                <button
                                  key={player.id}
                                  data-index={flatIdx}
                                  onClick={() => handleSelectB(player)}
                                  className={`w-full px-4 py-3 flex items-center space-x-3 hover:bg-white/5 transition-colors ${
                                    selectedIndexB === flatIdx
                                      ? 'bg-[#00FF85]/10'
                                      : ''
                                  }`}
                                >
                                  <TeamLogo
                                    logoUrl={player.logo_url}
                                    teamName={player.team_name}
                                    className="w-8 h-8 object-contain flex-shrink-0"
                                  />
                                  <div className="flex-1 text-left">
                                    <div className="text-sm font-medium text-white">
                                      {player.name}
                                    </div>
                                    <div className="text-xs text-white/50">
                                      {player.position} • {player.team_name}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>

              {loadingB && (
                <div className="mt-4 flex items-center justify-center p-4 bg-white/5 rounded-lg">
                  <FaSpinner className="animate-spin text-[#00FF85] mr-2" />
                  <span className="text-white/80">Loading player data...</span>
                </div>
              )}
              {errorB && (
                <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
                  {errorB}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Comparison Content */}
        <AnimatePresence mode="wait">
          {playerA && playerB ? (
            <motion.div
              key="comparison"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {/* The Face-Off Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-md border-b border-white/10 p-10 rounded-xl"
              >
                <div className="flex items-center justify-between relative">
                  {/* Player A */}
                  <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex-1 flex items-center space-x-6"
                  >
                    <TeamLogo
                      logoUrl={playerA.logo_url || playerA.team_logo}
                      teamName={playerA.team_name}
                      className="w-24 h-24 object-contain"
                    />
                    <div>
                      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        {playerA.player_name}
                      </h2>
                      <p className="text-white/60 text-sm">{playerA.position} • {playerA.team_name}</p>
                    </div>
                  </motion.div>

                  {/* VS Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.4 }}
                    className="absolute left-[44%] transform -translate-x-1/2 text-6xl md:text-8xl font-bold text-[#00FF85] drop-shadow-[0_0_15px_rgba(0,255,133,0.5)] z-10"
                  >
                    VS
                  </motion.div>

                  {/* Player B */}
                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex-1 flex items-center justify-end space-x-6"
                  >
                    <div className="text-right">
                      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        {playerB.player_name}
                      </h2>
                      <p className="text-white/60 text-sm">{playerB.position} • {playerB.team_name}</p>
                    </div>
                    <TeamLogo
                      logoUrl={playerB.logo_url || playerB.team_logo}
                      teamName={playerB.team_name}
                      className="w-24 h-24 object-contain"
                    />
                  </motion.div>
                </div>

                {/* Clear Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={clearComparison}
                  className="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
                  aria-label="Clear comparison"
                >
                  <FaTrash />
                </motion.button>
              </motion.div>

              {/* Stats Comparison Rows */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 space-y-4"
              >
                <h2 className="text-2xl font-bold text-white mb-6">Statistics Comparison</h2>
                {statsToCompare.map((stat, index) => {
                  const Icon = stat.icon;
                  const valA = playerA[stat.key];
                  const valB = playerB[stat.key];
                  const winner = getWinner(valA, valB);
                  const progress = getProgressPercentage(valA, valB);
                  
                  return (
                    <motion.div
                      key={stat.key}
                      initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="relative"
                    >
                      <div className="flex items-center justify-between py-4 border-b border-white/10 last:border-0">
                        {/* Player A Value */}
                        <motion.div
                          className={`text-right flex-1 pr-4 ${
                            winner === 'A' 
                              ? 'text-[#00FF85] drop-shadow-[0_0_8px_rgba(0,255,133,0.5)]' 
                              : 'text-white/60'
                          }`}
                          animate={winner === 'A' ? { scale: [1, 1.1, 1] } : {}}
                          transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                        >
                          <div className="text-2xl font-bold">{stat.format(valA)}</div>
                        </motion.div>

                        {/* Center Label */}
                        <div className="flex items-center space-x-2 px-6 flex-shrink-0">
                          <Icon className="text-white/40" />
                          <span className="font-semibold text-white/80 whitespace-nowrap">
                            {stat.label}
                          </span>
                        </div>

                        {/* Player B Value */}
                        <motion.div
                          className={`text-left flex-1 pl-4 ${
                            winner === 'B' 
                              ? 'text-[#00FF85] drop-shadow-[0_0_8px_rgba(0,255,133,0.5)]' 
                              : 'text-white/60'
                          }`}
                          animate={winner === 'B' ? { scale: [1, 1.1, 1] } : {}}
                          transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                        >
                          <div className="text-2xl font-bold">{stat.format(valB)}</div>
                        </motion.div>
                      </div>

                      {/* Progress Bars */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 flex">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress.left}%` }}
                          transition={{ duration: 0.8, delay: 0.6 + index * 0.1 }}
                          className="h-full bg-gradient-to-r from-transparent to-[#00FF85]"
                          style={{ opacity: winner === 'A' ? 0.6 : 0.2 }}
                        />
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress.right}%` }}
                          transition={{ duration: 0.8, delay: 0.6 + index * 0.1 }}
                          className="h-full bg-gradient-to-l from-transparent to-[#00FF85]"
                          style={{ opacity: winner === 'B' ? 0.6 : 0.2 }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Radar Chart */}
              {radarChartData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6"
                >
                  <h2 className="text-2xl font-bold text-white mb-6">Performance Profile</h2>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarChartData}>
                        <PolarGrid stroke="#ffffff" opacity={0.1} />
                        <PolarAngleAxis 
                          dataKey="subject" 
                          tick={{ fill: '#ffffff', fontSize: 12, fontWeight: 500 }}
                        />
                        <PolarRadiusAxis 
                          angle={90} 
                          domain={[0, 100]}
                          tick={{ fill: '#ffffff', fontSize: 10, opacity: 0.5 }}
                        />
                        <Radar
                          name={playerA.player_name}
                          dataKey="playerA"
                          stroke={teamColorA}
                          fill={teamColorA}
                          fillOpacity={0.3}
                          strokeWidth={2}
                        />
                        <Radar
                          name={playerB.player_name}
                          dataKey="playerB"
                          stroke={teamColorB}
                          fill={teamColorB}
                          fillOpacity={0.3}
                          strokeWidth={2}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px', color: '#ffffff' }}
                          iconType="line"
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center justify-center min-h-[400px]"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="text-8xl font-bold text-white/10 mb-8 drop-shadow-[0_0_15px_rgba(0,255,133,0.3)]"
                >
                  VS
                </motion.div>
                <p className="text-white/60 text-lg">
                  Select two players above to start comparing
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PlayerComparison;
