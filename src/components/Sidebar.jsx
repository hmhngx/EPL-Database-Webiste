import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaHome,
  FaListOl,
  FaFutbol,
  FaShieldAlt,
  FaUsers,
  FaChartBar,
  FaBalanceScale,
  FaTrophy,
  FaSearch,
  FaStar,
  FaClock,
  FaTimes,
  FaBook,
  FaChartPie,
  FaExclamationTriangle,
  FaChartLine,
} from 'react-icons/fa';
import NeonTooltip from './NeonTooltip';

const navItems = [
  { path: '/', label: 'Home', icon: FaHome },
  { path: '/standings', label: 'Standings', icon: FaListOl },
  { path: '/matches', label: 'Matches', icon: FaFutbol },
  { path: '/clubs', label: 'Clubs', icon: FaShieldAlt },
  { path: '/players', label: 'Players', icon: FaUsers },
  { path: '/stats', label: 'Stats Hub', icon: FaChartBar },
  { path: '/compare', label: 'Comparison', icon: FaBalanceScale },
  { path: '/bestxi', label: 'Best XI', icon: FaTrophy },
  { path: '/ffp', label: 'FFP War Room', icon: FaChartPie },
  { path: '/squad-risk', label: 'Squad Risk', icon: FaExclamationTriangle },
  { path: '/market-alpha', label: 'Market Alpha', icon: FaChartLine },
  { path: '/archive', label: 'Archive', icon: FaBook },
];

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('sidebarFavorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [recentlyVisited, setRecentlyVisited] = useState(() => {
    const saved = localStorage.getItem('sidebarRecentlyVisited');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      // Map stored items back to navItems to restore icon functions
      return parsed.map((storedItem) => {
        const navItem = navItems.find((item) => item.path === storedItem.path);
        return navItem ? { ...navItem, visitedAt: storedItem.visitedAt } : null;
      }).filter(Boolean);
    } catch {
      return [];
    }
  });

  // Track recently visited pages
  useEffect(() => {
    const currentPath = location.pathname;
    const currentItem = navItems.find((item) => item.path === currentPath);
    
    if (currentItem) {
      setRecentlyVisited((prev) => {
        const filtered = prev.filter((item) => item.path !== currentPath);
        const updated = [{ ...currentItem, visitedAt: Date.now() }, ...filtered].slice(0, 5);
        localStorage.setItem('sidebarRecentlyVisited', JSON.stringify(updated));
        return updated;
      });
    }
  }, [location.pathname]);

  // Filter nav items based on search query
  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return navItems;
    const query = searchQuery.toLowerCase();
    return navItems.filter((item) =>
      item.label.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const isActive = (path) => location.pathname === path;
  const isFavorite = (path) => favorites.includes(path);

  const toggleFavorite = (e, path) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) => {
      const updated = prev.includes(path)
        ? prev.filter((p) => p !== path)
        : [...prev, path];
      localStorage.setItem('sidebarFavorites', JSON.stringify(updated));
      return updated;
    });
  };

  const handleNavClick = (path) => {
    navigate(path);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const sidebarVariants = {
    open: {
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
    closed: {
      x: '-100%',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
  };

  const itemVariants = {
    open: {
      opacity: 1,
      x: 0,
    },
    closed: {
      opacity: 0,
      x: -20,
    },
  };

  const favoriteItems = navItems.filter((item) => favorites.includes(item.path));
  const displayItems = searchQuery.trim()
    ? filteredNavItems
    : [...favoriteItems, ...navItems.filter((item) => !favorites.includes(item.path))];

  return (
    <>
      {/* Overlay for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        variants={sidebarVariants}
        initial="closed"
        animate={isOpen ? 'open' : 'closed'}
        className="fixed top-0 left-0 h-full w-[280px] bg-[#0a0a0a]/80 backdrop-blur-md border-r border-[#00FF85]/20 z-50 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#00FF85]/10">
          <div className="flex items-center justify-between mb-4">
            <Link
              to="/"
              onClick={() => handleNavClick('/')}
              className="flex items-center space-x-2 group"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00FF85] to-[#00CC6A] flex items-center justify-center shadow-lg shadow-[#00FF85]/30">
                <FaFutbol className="text-[#0a0a0a] text-lg" />
              </div>
              <h1 className="text-xl font-bold text-white group-hover:text-[#00FF85] transition-colors">
                PL Analytics
              </h1>
            </Link>
            <NeonTooltip content="Close sidebar">
              <button
                onClick={onClose}
                className="md:hidden p-2 rounded-lg text-white/60 hover:text-[#00FF85] hover:bg-[#00FF85]/10 transition-colors"
                aria-label="Close sidebar"
              >
                <FaTimes />
              </button>
            </NeonTooltip>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#00FF85]/60" />
            <input
              type="text"
              placeholder="Search navigation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-[#00FF85]/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#00FF85] focus:border-[#00FF85] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-[#00FF85] transition-colors p-2"
                aria-label="Clear search"
              >
                <FaTimes className="text-sm" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <AnimatePresence mode="wait">
            {displayItems.length > 0 ? (
              displayItems.map((item, index) => {
                const Icon = item.icon || FaHome; // Fallback to FaHome if icon is undefined
                const active = isActive(item.path);
                const favorite = isFavorite(item.path);

                return (
                  <motion.div
                    key={item.path}
                    variants={itemVariants}
                    initial="closed"
                    animate="open"
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      to={item.path}
                      onClick={() => handleNavClick(item.path)}
                      className={`group relative flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                        active
                          ? 'bg-[#00FF85]/20 text-[#00FF85] shadow-lg shadow-[#00FF85]/20'
                          : 'text-white/70 hover:text-[#00FF85] hover:bg-[#00FF85]/10'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {Icon && (
                          <Icon
                            className={`text-lg ${
                              active ? 'text-[#00FF85]' : 'text-white/60 group-hover:text-[#00FF85]'
                            } transition-colors`}
                          />
                        )}
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <NeonTooltip content={favorite ? 'Remove from favorites' : 'Add to favorites'}>
                        <button
                          onClick={(e) => toggleFavorite(e, item.path)}
                          className={`p-2 rounded-md transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${
                            favorite
                              ? 'text-[#00FF85] hover:bg-[#00FF85]/20'
                              : 'text-white/30 hover:text-[#00FF85]/60 hover:bg-[#00FF85]/10 opacity-0 group-hover:opacity-100'
                          }`}
                          aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <FaStar className={`text-sm ${favorite ? 'fill-current' : ''}`} />
                        </button>
                      </NeonTooltip>
                      {active && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#00FF85] rounded-r-full shadow-lg shadow-[#00FF85]/50"
                          initial={false}
                        />
                      )}
                    </Link>
                  </motion.div>
                );
              })
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-white/40"
              >
                <p>No results found</p>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* Recently Visited Section */}
        {recentlyVisited.length > 0 && !searchQuery.trim() && (
          <div className="px-4 py-4 border-t border-[#00FF85]/10">
            <div className="flex items-center space-x-2 mb-3 px-2">
              <FaClock className="text-[#00FF85]/60 text-sm" />
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Recently Visited
              </h3>
            </div>
            <div className="space-y-1">
              {recentlyVisited.slice(0, 3).map((item) => {
                const Icon = item.icon || FaHome; // Fallback to FaHome if icon is undefined
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-white/50 hover:text-[#00FF85] hover:bg-[#00FF85]/10 transition-all group"
                  >
                    {Icon && (
                      <Icon className="text-sm text-white/40 group-hover:text-[#00FF85] transition-colors" />
                    )}
                    <span className="text-sm truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-[#00FF85]/10">
          <p className="text-xs text-white/30 text-center">
            Premier League Analytics
          </p>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
