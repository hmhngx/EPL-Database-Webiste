import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaTimes } from 'react-icons/fa';

/**
 * FilterHub Component
 * Searchable club filter with combobox functionality
 */
const FilterHub = ({ clubs, selectedClub, onClubSelect, onClear }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter clubs based on search query
  const filteredClubs = useMemo(() => {
    if (!searchQuery.trim()) {
      return clubs;
    }
    const query = searchQuery.toLowerCase();
    return clubs.filter(club => 
      club.toLowerCase().includes(query)
    );
  }, [clubs, searchQuery]);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsOpen(true);
    
    // If exact match found, select it
    const exactMatch = clubs.find(club => 
      club.toLowerCase() === value.toLowerCase()
    );
    if (exactMatch) {
      onClubSelect(exactMatch);
    } else if (value === '') {
      onClear();
    }
  };

  // Handle club selection
  const handleClubSelect = (club) => {
    onClubSelect(club);
    setSearchQuery(club);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Handle clear
  const handleClear = () => {
    setSearchQuery('');
    onClear();
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update search query when selectedClub changes externally
  useEffect(() => {
    if (selectedClub) {
      setSearchQuery(selectedClub);
    } else {
      setSearchQuery('');
    }
  }, [selectedClub]);

  return (
    <div className="relative w-full max-w-md" ref={dropdownRef}>
      <motion.div
        className="relative"
        animate={focused ? { scale: 1.01 } : { scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {/* Search Icon */}
        <FaSearch 
          className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${
            focused ? 'text-[#00FF85]' : 'text-gray-400'
          }`}
        />

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => {
            setFocused(true);
            setIsOpen(true);
          }}
          onBlur={() => {
            // Delay to allow click events on dropdown items
            setTimeout(() => setFocused(false), 200);
          }}
          placeholder="Filter by Club (e.g., Manchester City)"
          className={`
            w-full pl-12 pr-12 py-3 rounded-xl
            border-2 transition-all duration-300
            bg-white dark:bg-neutral-800
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none
            ${focused 
              ? 'border-[#00FF85] ring-4 ring-[#00FF85]/30 shadow-lg shadow-[#00FF85]/20' 
              : 'border-[#38003C] hover:border-[#38003C]/80'
            }
          `}
        />

        {/* Clear Button */}
        <AnimatePresence>
          {selectedClub && (
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
              aria-label="Clear filter"
            >
              <FaTimes className="text-gray-500 dark:text-gray-400" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && filteredClubs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 bg-white dark:bg-neutral-800 border-2 border-[#38003C] rounded-xl shadow-2xl max-h-60 overflow-y-auto"
          >
            {filteredClubs.map((club, index) => (
              <motion.button
                key={club}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => handleClubSelect(club)}
                className={`
                  w-full px-4 py-3 text-left text-sm
                  hover:bg-[#38003C] hover:text-white
                  dark:hover:bg-[#38003C] dark:hover:text-white
                  transition-colors duration-150
                  ${selectedClub === club ? 'bg-[#38003C] text-white' : 'text-gray-900 dark:text-white'}
                  ${index === 0 ? 'rounded-t-xl' : ''}
                  ${index === filteredClubs.length - 1 ? 'rounded-b-xl' : ''}
                `}
              >
                {club}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FilterHub;

