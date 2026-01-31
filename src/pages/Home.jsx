import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaListOl,
  FaFutbol,
  FaShieldAlt,
  FaUsers,
  FaChartBar,
  FaTrophy,
  FaBalanceScale,
  FaSearch,
  FaSpinner,
  FaTimes,
  FaUser,
  FaBook
} from 'react-icons/fa';
import TeamLogo from '../components/TeamLogo';
import logoImage from '/images/EPLdbWebsite.png';

const Home = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ players: [], teams: [] });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  // Debounced search function
  const performSearch = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults({ players: [], teams: [] });
      setIsSearchOpen(false);
      return;
    }

    setIsSearchLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        setSearchResults({ players: [], teams: [] });
        return;
      }
      
      setSearchResults(data.data || { players: [], teams: [] });
      setIsSearchOpen(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ players: [], teams: [] });
    } finally {
      setIsSearchLoading(false);
    }
  }, []);

  // Handle input change with debouncing
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  // Handle result selection
  const handleSelect = (item) => {
    if (item.type === 'player') {
      navigate(`/players/${item.id}`);
    } else if (item.type === 'team') {
      navigate(`/teams/${item.id}`);
    }
    setIsSearchOpen(false);
    setSearchQuery('');
    setSelectedIndex(-1);
  };

  // Get all results as a flat array for keyboard navigation
  const allResults = [
    ...searchResults.teams.map((team, idx) => ({ ...team, category: 'team', flatIndex: idx })),
    ...searchResults.players.map((player, idx) => ({ ...player, category: 'player', flatIndex: idx }))
  ];

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isSearchOpen || allResults.length === 0) {
      if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
        performSearch(searchQuery);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < allResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < allResults.length) {
          handleSelect(allResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsSearchOpen(false);
        setSearchQuery('');
        break;
      default:
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const hasResults = searchResults.players.length > 0 || searchResults.teams.length > 0;
  const showDropdown = isSearchOpen && (isSearchLoading || hasResults || (searchQuery.trim().length >= 2 && !isSearchLoading));

  // Command Center Shortcuts - 7 Cards
  const shortcutCards = [
    {
      id: 'standings',
      title: 'Live Table',
      subtitle: 'Standings',
      route: '/standings',
      icon: FaListOl,
      preview: (
        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/70">1.</span>
            <span className="text-white font-semibold">MCI</span>
            <span className="text-[#00FF85]">82 pts</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/70">2.</span>
            <span className="text-white font-semibold">ARS</span>
            <span className="text-[#00FF85]">78 pts</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/70">3.</span>
            <span className="text-white font-semibold">LIV</span>
            <span className="text-[#00FF85]">75 pts</span>
          </div>
        </div>
      ),
    },
    {
      id: 'matches',
      title: 'Fixtures & Results',
      subtitle: 'Matches',
      route: '/matches',
      icon: FaFutbol,
      preview: (
        <div className="text-center space-y-2 mt-4">
          <p className="text-white/70 text-sm">Latest Match</p>
          <p className="text-[#00FF85] font-bold text-lg">MCI 2-1 ARS</p>
          <p className="text-white/50 text-xs">View All Fixtures</p>
        </div>
      ),
    },
    {
      id: 'clubs',
      title: 'Team Directory',
      subtitle: 'Clubs',
      route: '/clubs',
      icon: FaShieldAlt,
      preview: (
        <div className="grid grid-cols-2 gap-3 mt-4">
          {['MCI', 'ARS', 'LIV', 'CHE'].map((team, idx) => (
            <div key={idx} className="flex items-center justify-center w-12 h-12 rounded-lg bg-white/5 border border-white/10">
              <span className="text-white/70 text-xs font-semibold">{team}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'players',
      title: 'Player Database',
      subtitle: 'Players',
      route: '/players',
      icon: FaUsers,
      preview: (
        <div className="flex flex-col items-center space-y-2 mt-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00FF85] to-[#00CC6A] flex items-center justify-center text-2xl font-bold text-[#0a0a0a]">
            <FaUsers className="text-[#0a0a0a]" />
          </div>
          <p className="text-white font-semibold text-center">Search 500+ Players</p>
        </div>
      ),
    },
    {
      id: 'stats',
      title: 'League Leaders',
      subtitle: 'Stats Hub',
      route: '/stats',
      icon: FaChartBar,
      preview: (
        <div className="flex flex-col items-center space-y-2 mt-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00FF85] to-[#00CC6A] flex items-center justify-center">
            <FaTrophy className="text-2xl text-[#0a0a0a]" />
          </div>
          <p className="text-white font-semibold text-center">Golden Boot Leader</p>
          <p className="text-[#00FF85] text-sm">View All Stats</p>
        </div>
      ),
    },
    {
      id: 'bestxi',
      title: 'Team of the Season',
      subtitle: 'Best XI',
      route: '/bestxi',
      icon: FaTrophy,
      preview: (
        <div className="flex flex-col items-center space-y-3 mt-4">
          <div className="w-20 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <span className="text-3xl">⚽</span>
          </div>
          <p className="text-white/70 text-sm text-center">View Formation</p>
        </div>
      ),
    },
    {
      id: 'comparison',
      title: 'Head-to-Head',
      subtitle: 'Comparison',
      route: '/compare',
      icon: FaBalanceScale,
      preview: (
        <div className="flex flex-col items-center space-y-3 mt-4">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl">
              <FaUser className="text-2xl text-[#0a0a0a]" />
            </div>
            <span className="text-[#00FF85] text-3xl font-bold">VS</span>
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl">
              <FaUser className="text-2xl text-[#0a0a0a]" />
            </div>
          </div>
          <p className="text-white/70 text-sm text-center">Compare Players</p>
        </div>
      ),
    },
    {
      id: 'archive',
      title: 'The Archive',
      subtitle: 'Digital Humanities',
      route: '/archive',
      icon: FaBook,
      preview: (
        <div className="flex flex-col items-center space-y-3 mt-4">
          <div className="w-20 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center"> <FaBook className="text-2xl text-[#0a0a0a]" /></div>
          <p className="text-white/70 text-sm text-center">Explore Historical Data</p>
        </div>
      ),
    },
  ];

  const handleCardClick = (route) => {
    navigate(route);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-6 py-12 sm:py-16 lg:py-20">
        {/* Hero Section - Logo & Search Hub */}
        <motion.section
          className="relative w-full flex flex-col items-center justify-center mb-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Logo */}
          <motion.div
            className="mb-6 flex justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <img
              src={logoImage}
              alt="Premier League Analytics Hub Logo"
              className="h-32 w-auto mx-auto drop-shadow-[0_0_15px_rgba(0,255,133,0.4)]"
            />
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white uppercase mb-12 tracking-tighter leading-none text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Premier League Analytics
          </motion.h1>

          {/* Quick Search Bar */}
          <motion.div
            className="relative max-w-2xl mx-auto w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-5 text-xl text-white focus-within:border-[#00FF85] transition-all shadow-2xl">
              <FaSearch className="absolute left-5 top-1/2 transform -translate-y-1/2 text-[#00FF85] text-xl" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search players, clubs..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim().length >= 2) {
                    setIsSearchOpen(true);
                  }
                }}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) {
                    setIsSearchOpen(true);
                  }
                }}
                onKeyDown={handleKeyDown}
                className="w-full pl-12 pr-10 py-2 bg-transparent text-white text-xl placeholder-white/40 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults({ players: [], teams: [] });
                    setIsSearchOpen(false);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-5 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-[#00FF85] transition-colors"
                  aria-label="Clear search"
                >
                  <FaTimes className="text-lg" />
                </button>
              )}
              {isSearchLoading && (
                <div className="absolute right-5 top-1/2 transform -translate-y-1/2">
                  <FaSpinner className="text-[#00FF85] text-xl animate-spin" />
                </div>
              )}
            </div>

            {/* Quick Results Dropdown */}
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  ref={dropdownRef}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 right-0 mt-4 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-50 backdrop-blur-xl"
                >
                  {isSearchLoading ? (
                    <div className="p-6 text-center text-white/60">
                      <FaSpinner className="animate-spin mx-auto mb-2 text-[#00FF85] text-2xl" />
                      <p>Searching...</p>
                    </div>
                  ) : hasResults ? (
                    <div>
                      {/* Teams Section */}
                      {searchResults.teams.length > 0 && (
                        <div className="border-b border-white/10">
                          <div className="px-4 py-3 bg-white/5 text-xs font-semibold text-white/60 uppercase tracking-wider">
                            Clubs ({searchResults.teams.length})
                          </div>
                          {searchResults.teams.map((team, idx) => {
                            const flatIdx = idx;
                            return (
                              <button
                                key={team.id}
                                data-index={flatIdx}
                                onClick={() => handleSelect(team)}
                                className={`w-full px-4 py-4 flex items-center space-x-4 hover:bg-white/5 transition-colors ${
                                  selectedIndex === flatIdx
                                    ? 'bg-[#00FF85]/20'
                                    : ''
                                }`}
                              >
                                <TeamLogo
                                  logoUrl={team.logo_url}
                                  teamName={team.name}
                                  className="w-10 h-10 object-contain flex-shrink-0"
                                />
                                <span className="text-base font-medium text-white flex-1 text-left">
                                  {team.name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Players Section */}
                      {searchResults.players.length > 0 && (
                        <div>
                          <div className="px-4 py-3 bg-white/5 text-xs font-semibold text-white/60 uppercase tracking-wider">
                            Players ({searchResults.players.length})
                          </div>
                          {searchResults.players.map((player, idx) => {
                            const flatIdx = searchResults.teams.length + idx;
                            return (
                              <button
                                key={player.id}
                                data-index={flatIdx}
                                onClick={() => handleSelect(player)}
                                className={`w-full px-4 py-4 flex items-center space-x-4 hover:bg-white/5 transition-colors ${
                                  selectedIndex === flatIdx
                                    ? 'bg-[#00FF85]/20'
                                    : ''
                                }`}
                              >
                                <TeamLogo
                                  logoUrl={player.logo_url}
                                  teamName={player.team_name}
                                  className="w-10 h-10 object-contain flex-shrink-0"
                                />
                                <div className="flex-1 text-left">
                                  <div className="text-base font-medium text-white">
                                    {player.name}
                                  </div>
                                  <div className="text-sm text-white/50">
                                    {player.position} • {player.team_name}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : searchQuery.trim().length >= 2 ? (
                    <div className="p-6 text-center text-white/60">
                      <p>No results found</p>
                    </div>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.section>

        {/* Visual Shortcuts - Bento Grid */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shortcutCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.id}
                  variants={cardVariants}
                  custom={index}
                  onClick={() => handleCardClick(card.route)}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-[#00FF85]/50 transition-all group cursor-pointer"
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Icon and Title */}
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-12 h-12 rounded-lg bg-[#00FF85]/20 flex items-center justify-center group-hover:bg-[#00FF85]/30 transition-colors">
                      <Icon className="text-[#00FF85] text-xl" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-[#00FF85] transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-sm text-white/50">{card.subtitle}</p>
                    </div>
                  </div>

                  {/* Preview Content */}
                  {card.preview}
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default Home;
