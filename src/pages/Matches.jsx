import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FaSpinner, FaCalendarAlt, FaChevronDown } from 'react-icons/fa';

const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortType, setSortType] = useState('date_newest');

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

  // Sort matches based on sortType - memoized for performance
  const sortedMatches = useMemo(() => {
    if (!matches || matches.length === 0) {
      return [];
    }

    // Create a copy to avoid mutating the original array
    const matchesCopy = Array.isArray(matches) ? [...matches] : [];
    
    if (matchesCopy.length === 0) {
      return [];
    }

    try {
      const sorted = [...matchesCopy].sort((a, b) => {
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
      return Array.isArray(matches) ? [...matches] : [];
    }
  }, [matches, sortType]);

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

      {/* Sort By Dropdown */}
      <div className="relative group max-w-md">
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
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedMatches.map((match, index) => {
          const matchweek = match.matchweek || match.gameweek_num || calculateMatchweek(index);
          const hasScore = match.home_team_score !== null && match.away_team_score !== null;
          
          return (
            <motion.div
              key={match.match_id || `match-${match.date}-${index}`}
              variants={isInitialLoad ? cardVariants : undefined}
              initial={isInitialLoad ? "hidden" : false}
              animate={isInitialLoad ? "visible" : false}
              layout
              transition={{ 
                layout: { duration: 0.1, ease: "easeOut" },
                opacity: { duration: 0 },
                y: { duration: 0 }
              }}
              className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 relative hover:shadow-xl transition-shadow duration-300"
            >
              {/* Matchweek Badge */}
              {matchweek && (
                <div className="absolute top-4 right-4">
                  <span className="bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 text-xs font-semibold px-2 py-1 rounded">
                    GW {matchweek}
                  </span>
                </div>
              )}

              {/* Date Row */}
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {formatDate(match.date)}
              </div>

              {/* Teams and Score Row */}
              <div className="flex items-center justify-between">
                {/* Home Team */}
                <div className="flex-1 text-left">
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {match.home_team || match.home_team_name}
                  </p>
                </div>

                {/* Score */}
                <div className="flex-shrink-0 mx-4">
                  {hasScore ? (
                    <div className="text-2xl font-bold" style={{ color: '#00FF85' }}>
                      {match.home_team_score} - {match.away_team_score}
                    </div>
                  ) : (
                    <div className="text-lg font-semibold text-gray-400 dark:text-gray-500">
                      vs
                    </div>
                  )}
                </div>

                {/* Away Team */}
                <div className="flex-1 text-right">
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {match.away_team || match.away_team_name}
                  </p>
                </div>
              </div>

              {/* Attendance Row */}
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
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-700">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-semibold">Attendance:</span>{' '}
                      <span className="text-gray-900 dark:text-white">
                        {attendanceNum.toLocaleString('en-US')}
                      </span>
                    </div>
                  </div>
                ) : null;
              })()}
            </motion.div>
          );
        })}
      </div>

      {sortedMatches.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-100 dark:bg-neutral-800 rounded-xl p-8 text-center"
        >
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            No matches found.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default Matches;
