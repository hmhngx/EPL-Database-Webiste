import { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaFilter, FaMapMarkerAlt, FaCheck } from 'react-icons/fa';

const Filters = ({ 
  searchQuery, 
  setSearchQuery, 
  resultFilter, 
  setResultFilter, 
  venueFilter, 
  setVenueFilter, 
  teamId = null 
}) => {
  const [hasChanges, setHasChanges] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  // Track changes for visual feedback
  useEffect(() => {
    const hasActiveFilters = 
      searchQuery !== '' || 
      resultFilter !== 'all' || 
      (teamId && venueFilter !== 'all');
    
    setHasChanges(hasActiveFilters);
  }, [searchQuery, resultFilter, venueFilter, teamId]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleResultFilterChange = (e) => {
    setResultFilter(e.target.value);
  };

  const handleVenueFilterChange = (e) => {
    setVenueFilter(e.target.value);
  };

  const inputVariants = {
    focused: {
      scale: 1.02,
      transition: { duration: 0.2 }
    },
    unfocused: {
      scale: 1,
      transition: { duration: 0.2 }
    }
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        repeatDelay: 2
      }
    },
    idle: {
      scale: 1
    }
  };

  return (
    <div className="space-y-4" role="group" aria-label="Match filters">
      {/* ARIA live region for filter updates */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {hasChanges && 'Filters applied'}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search Input */}
        <motion.div 
          className="relative"
          variants={inputVariants}
          animate={focusedInput === 'search' ? 'focused' : 'unfocused'}
        >
          <FaSearch 
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${
              focusedInput === 'search' 
                ? 'text-green-400' 
                : 'text-gray-400'
            }`}
            aria-hidden="true"
          />
          <motion.input
            type="text"
            placeholder={teamId ? "Search by opponent name..." : "Search by team name..."}
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setFocusedInput('search')}
            onBlur={() => setFocusedInput(null)}
            className="w-full pl-10 pr-4 py-2.5 rounded-md border-2 border-blue-200/50 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 hover:border-green-400 hover:shadow-md transition-all duration-300"
            aria-label="Search matches by team name"
            aria-describedby="search-description"
          />
          <span id="search-description" className="sr-only">
            Enter team name to filter matches
          </span>
          
          {/* Placeholder fade effect */}
          <AnimatePresence>
            {!searchQuery && focusedInput !== 'search' && (
              <motion.div
                initial={{ opacity: 0.5 }}
                animate={{ opacity: [0.5, 0.7, 0.5] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute left-10 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500"
              >
                {teamId ? "Search by opponent name..." : "Search by team name..."}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Result Filter Dropdown */}
        <motion.div 
          className="relative"
          variants={inputVariants}
          animate={focusedInput === 'result' ? 'focused' : 'unfocused'}
        >
          <FaFilter 
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-300 pointer-events-none z-10 ${
              focusedInput === 'result' 
                ? 'text-green-400' 
                : 'text-gray-400'
            }`}
            aria-hidden="true"
          />
          <motion.select
            value={resultFilter}
            onChange={handleResultFilterChange}
            onFocus={() => setFocusedInput('result')}
            onBlur={() => setFocusedInput(null)}
            whileHover={{ scale: 1.01 }}
            className="w-full pl-10 pr-8 py-2.5 rounded-md border-2 border-blue-200/50 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 hover:border-green-400 hover:shadow-md hover:text-green-600 dark:hover:text-green-400 transition-all duration-300 cursor-pointer"
            aria-label="Filter matches by result"
            aria-describedby="result-description"
          >
            <option value="all">All Results</option>
            {teamId ? (
              <>
                <option value="win">Wins</option>
                <option value="loss">Losses</option>
                <option value="draw">Draws</option>
              </>
            ) : (
              <>
                <option value="win">Wins (Any Team)</option>
                <option value="draw">Draws</option>
              </>
            )}
          </motion.select>
          <span id="result-description" className="sr-only">
            Select match result type to filter
          </span>
          
          {/* Custom dropdown arrow */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg 
              className={`w-4 h-4 transition-colors duration-300 ${
                focusedInput === 'result' 
                  ? 'text-green-400' 
                  : 'text-gray-400'
              }`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Change indicator */}
          <AnimatePresence>
            {resultFilter !== 'all' && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute right-8 top-1/2 transform -translate-y-1/2"
              >
                <FaCheck className="text-green-500 text-xs" aria-hidden="true" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Venue Filter (only shown when teamId is provided) */}
        {teamId && (
          <motion.div 
            className="relative"
            variants={inputVariants}
            animate={focusedInput === 'venue' ? 'focused' : 'unfocused'}
          >
            <FaMapMarkerAlt 
              className={`absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-300 pointer-events-none z-10 ${
                focusedInput === 'venue' 
                  ? 'text-green-400' 
                  : 'text-gray-400'
              }`}
              aria-hidden="true"
            />
            <motion.select
              value={venueFilter}
              onChange={handleVenueFilterChange}
              onFocus={() => setFocusedInput('venue')}
              onBlur={() => setFocusedInput(null)}
              whileHover={{ scale: 1.01 }}
              className="w-full pl-10 pr-8 py-2.5 rounded-md border-2 border-blue-200/50 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 hover:border-green-400 hover:shadow-md hover:text-green-600 dark:hover:text-green-400 transition-all duration-300 cursor-pointer"
              aria-label="Filter matches by venue"
              aria-describedby="venue-description"
            >
              <option value="all">All Venues</option>
              <option value="home">Home</option>
              <option value="away">Away</option>
            </motion.select>
            <span id="venue-description" className="sr-only">
              Select home or away matches to filter
            </span>
            
            {/* Custom dropdown arrow */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg 
                className={`w-4 h-4 transition-colors duration-300 ${
                  focusedInput === 'venue' 
                    ? 'text-green-400' 
                    : 'text-gray-400'
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Change indicator */}
            <AnimatePresence>
              {venueFilter !== 'all' && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute right-8 top-1/2 transform -translate-y-1/2"
                >
                  <FaCheck className="text-green-500 text-xs" aria-hidden="true" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Visual feedback indicator */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            variants={pulseVariants}
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
            role="status"
            aria-live="polite"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            >
              <FaCheck className="text-green-500" aria-hidden="true" />
            </motion.div>
            <span>Filters active</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Filters;
