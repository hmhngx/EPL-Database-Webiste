import { useState, useEffect, useMemo } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { FaSpinner, FaCalendarAlt, FaChevronDown, FaVideo } from 'react-icons/fa';
import LitePlayer from '../components/LitePlayer';
import TeamLogo from '../components/TeamLogo';
import FilterHub from '../components/FilterHub';

const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortType, setSortType] = useState('date_newest');
  const [showHighlights, setShowHighlights] = useState({});
  const [selectedClub, setSelectedClub] = useState(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/matches');
        if (!response.ok) throw new Error('Failed to fetch matches');
        const data = await response.json();
        setMatches(data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  // Format date as 'Sat, Aug 12'
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Calculate matchweek (optional - if not in API)
  const calculateMatchweek = (index) => {
    // Simple calculation: every 10 matches = 1 gameweek
    return Math.floor(index / 10) + 1;
  };

  // Helper function to parse attendance as integer (moved outside useMemo for stability)
  const parseAttendance = (attendance) => {
    if (attendance == null || attendance === '') {
      return 0;
    }
    if (typeof attendance === 'number') {
      return attendance;
    }
    // Parse string, removing any non-numeric characters (commas, spaces, etc.)
    const cleaned = String(attendance).replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  };

  // Helper function to calculate total goals (moved outside useMemo for stability)
  const getTotalGoals = (match) => {
    const homeGoals = parseInt(match.home_team_score || 0, 10);
    const awayGoals = parseInt(match.away_team_score || 0, 10);
    return homeGoals + awayGoals;
  };

  // Extract unique club names from matches - memoized for performance
  const uniqueClubs = useMemo(() => {
    if (!matches || matches.length === 0) {
      return [];
    }
    const clubsSet = new Set();
    matches.forEach(match => {
      const homeTeam = match.home_team || match.home_team_name;
      const awayTeam = match.away_team || match.away_team_name;
      if (homeTeam) clubsSet.add(homeTeam);
      if (awayTeam) clubsSet.add(awayTeam);
    });
    return Array.from(clubsSet).sort();
  }, [matches]);

  // Filter matches by selected club - memoized for performance
  const filteredMatches = useMemo(() => {
    if (!selectedClub) {
      return matches;
    }
    return matches.filter(match => {
      const homeTeam = match.home_team || match.home_team_name;
      const awayTeam = match.away_team || match.away_team_name;
      return homeTeam === selectedClub || awayTeam === selectedClub;
    });
  }, [matches, selectedClub]);

  // Sort matches based on sortType - memoized for performance
  const sortedMatches = useMemo(() => {
    if (!filteredMatches || filteredMatches.length === 0) {
      return [];
    }

    try {
      const sorted = [...filteredMatches].sort((a, b) => {
        let comparison = 0;

        switch (sortType) {
          case 'date_newest': {
            // Date Descending (newest first)
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
              return 0; // Invalid dates, maintain order
            }
            comparison = dateB.getTime() - dateA.getTime();
            break;
          }
          
          case 'date_oldest': {
            // Date Ascending (oldest first)
            const dateAOld = new Date(a.date);
            const dateBOld = new Date(b.date);
            if (isNaN(dateAOld.getTime()) || isNaN(dateBOld.getTime())) {
              return 0; // Invalid dates, maintain order
            }
            comparison = dateAOld.getTime() - dateBOld.getTime();
            break;
          }
          
          case 'goals_high': {
            // Total Goals Descending (highest first)
            const goalsA = getTotalGoals(a);
            const goalsB = getTotalGoals(b);
            comparison = goalsB - goalsA;
            // If goals are equal, sort by date (newest first)
            if (comparison === 0) {
              const dateA = new Date(a.date);
              const dateB = new Date(b.date);
              if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
                comparison = dateB.getTime() - dateA.getTime();
              }
            }
            break;
          }
          
          case 'goals_low': {
            // Total Goals Ascending (lowest first)
            const goalsALow = getTotalGoals(a);
            const goalsBLow = getTotalGoals(b);
            comparison = goalsALow - goalsBLow;
            // If goals are equal, sort by date (newest first)
            if (comparison === 0) {
              const dateA = new Date(a.date);
              const dateB = new Date(b.date);
              if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
                comparison = dateB.getTime() - dateA.getTime();
              }
            }
            break;
          }
          
          case 'attendance_high': {
            // Attendance Descending (highest first)
            const attendanceA = parseAttendance(a.attendance);
            const attendanceB = parseAttendance(b.attendance);
            comparison = attendanceB - attendanceA;
            // If attendance is equal, sort by date (newest first)
            if (comparison === 0) {
              const dateA = new Date(a.date);
              const dateB = new Date(b.date);
              if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
                comparison = dateB.getTime() - dateA.getTime();
              }
            }
            break;
          }
          
          case 'attendance_low': {
            // Attendance Ascending (lowest first)
            const attendanceALow = parseAttendance(a.attendance);
            const attendanceBLow = parseAttendance(b.attendance);
            comparison = attendanceALow - attendanceBLow;
            // If attendance is equal, sort by date (newest first)
            if (comparison === 0) {
              const dateA = new Date(a.date);
              const dateB = new Date(b.date);
              if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
                comparison = dateB.getTime() - dateA.getTime();
              }
            }
            break;
          }
          
          default: {
            // Default to date_newest
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
              comparison = dateB.getTime() - dateA.getTime();
            }
          }
        }

        return comparison;
      });
      
      return sorted;
    } catch (error) {
      console.error('Error sorting matches:', error);
      console.error('Sort type:', sortType);
      console.error('Error details:', error.message, error.stack);
      // Return a copy of the original array if sorting fails
      return Array.isArray(filteredMatches) ? [...filteredMatches] : [];
    }
  }, [filteredMatches, sortType]);

  // Handle club selection
  const handleClubSelect = (club) => {
    setSelectedClub(club);
  };

  // Handle clear filter
  const handleClearFilter = () => {
    setSelectedClub(null);
  };

  // Track if this is the initial load to only animate on first render
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // After initial load, disable heavy animations for better performance
    if (isInitialLoad && !loading && matches.length > 0) {
      const timer = setTimeout(() => {
        setIsInitialLoad(false);
      }, 600); // Allow initial animation to complete
      return () => clearTimeout(timer);
    }
  }, [loading, matches.length, isInitialLoad]);

  // Disable animations immediately when sort changes for instant updates
  useEffect(() => {
    if (!isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [sortType, isInitialLoad]);

  const cardVariants = {
    hidden: { opacity: 0, y: 5 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.1,
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
        <p className="font-bold">Error loading matches</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-6 border-2 border-accent/30 shadow-lg"
      >
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <FaCalendarAlt className="text-4xl text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold text-white mb-2">
              Premier League Matches
            </h1>
            <p className="text-gray-300">Scores and fixtures</p>
          </div>
        </div>
      </motion.div>

      {/* Filter Hub and Sort Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        {/* Filter Hub */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1"
        >
          <FilterHub
            clubs={uniqueClubs}
            selectedClub={selectedClub}
            onClubSelect={handleClubSelect}
            onClear={handleClearFilter}
          />
        </motion.div>

        {/* Sort By Dropdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative group max-w-md w-full md:w-auto"
        >
          <select
            id="sort-select"
            value={sortType}
            onChange={(e) => {
              const newSortType = e.target.value;
              setSortType(newSortType);
            }}
            aria-label="Sort matches"
            className="
              w-full
              bg-white dark:bg-neutral-800
              border-2 border-primary/50 dark:border-primary/60
              rounded-xl 
              pl-6 pr-14 py-4
              text-primary dark:text-white
              font-heading font-bold
              text-base
              focus:outline-none 
              focus:ring-4 
              focus:ring-accent/40
              focus:border-accent
              focus:shadow-xl
              focus:shadow-accent/30
              transition-all duration-300
              cursor-pointer
              hover:border-accent/80
              hover:shadow-lg
              hover:shadow-primary/20
              appearance-none
              shadow-lg
            "
          >
            <option value="date_newest">📅 Date (Newest First)</option>
            <option value="date_oldest">📅 Date (Oldest First)</option>
            <option value="goals_high">⚽ Total Goals (High to Low)</option>
            <option value="goals_low">⚽ Total Goals (Low to High)</option>
            <option value="attendance_high">👥 Attendance (High to Low)</option>
            <option value="attendance_low">👥 Attendance (Low to High)</option>
          </select>
          {/* Custom dropdown arrow */}
          <div className="absolute right-5 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <FaChevronDown className="text-primary dark:text-accent text-lg" />
          </div>
        </motion.div>
      </div>

      {/* Matches Grid */}
      <AnimatePresence mode="wait">
        {sortedMatches.length > 0 ? (
          <motion.div
            key="matches-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {sortedMatches.map((match, index) => {
          const matchweek = match.matchweek || match.gameweek_num || calculateMatchweek(index);
          const hasScore = match.home_team_score !== null && match.away_team_score !== null;
          const homeTeamName = match.home_team || match.home_team_name;
          const awayTeamName = match.away_team || match.away_team_name;
          const homeLogoUrl = match.home_logo_url || match.home_logo;
          const awayLogoUrl = match.away_logo_url || match.away_logo;
          
          // Determine winner for highlighting
          const homeScore = parseInt(match.home_team_score || 0, 10);
          const awayScore = parseInt(match.away_team_score || 0, 10);
          const homeWon = hasScore && homeScore > awayScore;
          const awayWon = hasScore && awayScore > homeScore;
          
          // Format time for upcoming matches
          const formatTime = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            });
          };
          
          return (
            <motion.div
              key={match.match_id || `match-${match.date}-${index}`}
              variants={isInitialLoad ? cardVariants : undefined}
              initial={isInitialLoad ? "hidden" : { opacity: 0, scale: 0.9 }}
              animate={isInitialLoad ? "visible" : { opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              layout
              transition={{ 
                layout: { duration: 0.1, ease: "easeOut" },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 }
              }}
              className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 relative hover:scale-[1.02] hover:shadow-2xl hover:shadow-[#38003C]/50 transition-all duration-300"
            >
              {/* Header: Matchweek Badge and Date */}
              <div className="flex items-center justify-between mb-6">
                {matchweek && (
                  <div className="bg-[#38003C] text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                    GW {matchweek}
                  </div>
                )}
                <div className="text-sm text-gray-400 font-medium">
                  {formatDate(match.date)}
                </div>
              </div>

              {/* Main Content: Versus Layout */}
              <div className="grid grid-cols-3 gap-6 items-center mb-6">
                {/* Left: Home Team */}
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className={`transition-all duration-300 ${homeWon ? 'opacity-100 scale-105' : 'opacity-90'}`}>
                    <TeamLogo
                      logoUrl={homeLogoUrl}
                      teamName={homeTeamName}
                      className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-xl"
                    />
                  </div>
                  <p className={`text-sm md:text-base font-bold text-white text-center leading-tight ${homeWon ? 'text-[#00FF85]' : ''} line-clamp-2`}>
                    {homeTeamName}
                  </p>
                </div>

                {/* Center: Score/Time */}
                <div className="flex items-center justify-center">
                  {hasScore ? (
                    <div className="flex items-center gap-3">
                      <div className={`text-4xl md:text-5xl font-bold ${homeWon ? 'text-[#00FF85]' : 'text-white'}`}>
                        {homeScore}
                      </div>
                      <div className="text-2xl text-gray-500 font-light">-</div>
                      <div className={`text-4xl md:text-5xl font-bold ${awayWon ? 'text-[#00FF85]' : 'text-white'}`}>
                        {awayScore}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xl md:text-2xl font-bold text-white">
                      {formatTime(match.date)}
                    </div>
                  )}
                </div>

                {/* Right: Away Team */}
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className={`transition-all duration-300 ${awayWon ? 'opacity-100 scale-105' : 'opacity-90'}`}>
                    <TeamLogo
                      logoUrl={awayLogoUrl}
                      teamName={awayTeamName}
                      className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-xl"
                    />
                  </div>
                  <p className={`text-sm md:text-base font-bold text-white text-center leading-tight ${awayWon ? 'text-[#00FF85]' : ''} line-clamp-2`}>
                    {awayTeamName}
                  </p>
                </div>
              </div>

              {/* Footer: Attendance and Highlights */}
              <div className="space-y-3">
                {/* Attendance */}
                {match.attendance != null && match.attendance !== '' && (() => {
                  // Handle attendance - ensure it's a number and format properly
                  let attendanceNum;
                  if (typeof match.attendance === 'number') {
                    attendanceNum = match.attendance;
                  } else {
                    // Parse string, removing any non-numeric characters (commas, spaces, etc.)
                    const cleaned = String(match.attendance).replace(/[^0-9]/g, '');
                    attendanceNum = cleaned ? parseInt(cleaned, 10) : 0;
                  }
                  
                  return attendanceNum > 0 ? (
                    <div className="text-sm text-gray-400 text-center">
                      <span className="font-semibold">Attendance:</span>{' '}
                      <span className="text-gray-300">
                        {attendanceNum.toLocaleString('en-US')}
                      </span>
                    </div>
                  ) : null;
                })()}

                {/* Highlights Section */}
                {match.youtube_id && (
                  <motion.button
                    onClick={() => setShowHighlights(prev => ({
                      ...prev,
                      [match.match_id]: !prev[match.match_id]
                    }))}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 font-medium shadow-lg"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FaVideo />
                    <span>{showHighlights[match.match_id] ? 'Hide Highlights' : 'Watch Highlights'}</span>
                  </motion.button>
                )}
                
                {match.youtube_id && showHighlights[match.match_id] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3"
                  >
                    <LitePlayer youtubeId={match.youtube_id} />
                  </motion.div>
                )}
              </div>
            </motion.div>
            );
          })}
          </motion.div>
        ) : (
          <motion.div
            key="no-matches"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl p-12 text-center"
          >
            <div className="space-y-4">
              <div className="text-6xl mb-4">⚽</div>
              <h3 className="text-2xl font-heading font-bold text-white mb-2">
                {selectedClub 
                  ? `No matches found for ${selectedClub}` 
                  : 'No matches found'}
              </h3>
              <p className="text-gray-400">
                {selectedClub 
                  ? 'Try selecting a different club or clear the filter to see all matches.'
                  : 'There are no matches available at the moment.'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Matches;
