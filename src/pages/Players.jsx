import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSpinner, FaSearch, FaFilter, FaSort, FaSortUp, FaSortDown, FaCrown } from 'react-icons/fa';
import Filters from '../components/Filters';
import TeamLogo from '../components/TeamLogo';

const Players = () => {
  const [players, setPlayers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchName, setSearchName] = useState('');
  const [searchNationality, setSearchNationality] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [clubFilter, setClubFilter] = useState('all');
  const [captainFilter, setCaptainFilter] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'player_name', direction: 'asc' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const playersResponse = await fetch('/api/players');
        if (!playersResponse.ok) throw new Error('Failed to fetch players');
        const playersData = await playersResponse.json();
        setPlayers(playersData.data || []);

        const clubsResponse = await fetch('/api/clubs');
        if (clubsResponse.ok) {
          const clubsData = await clubsResponse.json();
          setClubs(clubsData.data || []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredPlayers = useMemo(() => {
    let filtered = [...players];

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

    if (positionFilter !== 'all') {
      const positionMap = {
        'GK': 'Goalkeeper',
        'DEF': 'Defender',
        'MID': 'Midfielder',
        'FWD': 'Forward'
      };
      const fullPosition = positionMap[positionFilter] || positionFilter;
      filtered = filtered.filter(player => player.position === fullPosition);
    }

    if (clubFilter !== 'all') {
      // Ensure both values are strings for proper comparison
      filtered = filtered.filter(player => 
        player.team_id && String(player.team_id) === String(clubFilter)
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
      const stringFields = ['player_name', 'name', 'team_name', 'position', 'nationality'];
      
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
  }, [players, searchName, searchNationality, positionFilter, clubFilter, captainFilter, sortConfig]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

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

  const getPositionAbbreviation = (position) => {
    const abbrev = {
      'Goalkeeper': 'GK',
      'Defender': 'DEF',
      'Midfielder': 'MID',
      'Forward': 'FWD'
    };
    return abbrev[position] || position;
  };

  const getPositionColor = (position) => {
    const colors = {
      'Goalkeeper': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
      'Defender': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700',
      'Midfielder': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700',
      'Forward': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'
    };
    return colors[position] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
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
        <p className="font-bold">Error loading players</p>
        <p>{error}</p>
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-6 border-2 border-accent/30 shadow-lg mb-8"
      >
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <FaSearch className="text-4xl text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold text-white mb-2">
              Player Directory
            </h1>
            <p className="text-gray-300">Search and filter all Premier League players</p>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 space-y-4"
      >
        <div className="flex items-center space-x-2 mb-4">
          <FaFilter className="text-primary" />
          <h2 className="text-xl font-heading font-semibold text-gray-900 dark:text-white">Filters</h2>
        </div>

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
              <option value="GK">Goalkeeper</option>
              <option value="DEF">Defender</option>
              <option value="MID">Midfielder</option>
              <option value="FWD">Forward</option>
            </select>
          </motion.div>

          <motion.div
            className="relative"
            whileHover={{ scale: 1.02 }}
          >
            <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
            <select
              value={clubFilter}
              onChange={(e) => setClubFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-300 focus:border-green-400 appearance-none transition-all duration-300 hover:shadow-xl"
            >
              <option value="all">All Teams</option>
              {clubs.map((club) => (
                <option key={club.team_id} value={club.team_id}>
                  {club.team_name}
                </option>
              ))}
            </select>
          </motion.div>
        </div>

        {/* Captain Filter Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center pt-2"
        >
          <motion.button
            onClick={() => setCaptainFilter(!captainFilter)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold text-sm
              transition-all duration-300 shadow-md
              ${captainFilter 
                ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-yellow-900 border-2 border-yellow-300 dark:border-yellow-700 shadow-lg' 
                : 'bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-neutral-600 hover:bg-gray-200 dark:hover:bg-neutral-600'
              }
            `}
          >
            <FaCrown className={captainFilter ? 'text-yellow-900' : 'text-gray-500 dark:text-gray-400'} />
            <span>{captainFilter ? 'Showing Captains Only' : 'Show Captains Only'}</span>
          </motion.button>
        </motion.div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredPlayers.length} of {players.length} players
        </div>
      </motion.div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
              <thead className="bg-primary text-white sticky top-0 z-10">
                <tr>
                  {['player_name', 'position', 'team_name', 'nationality', 'age'].map((key) => (
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
                <AnimatePresence>
                  {filteredPlayers.map((player, index) => (
                    <motion.tr
                      key={player.id || `player-${index}`}
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className={`
                        ${index % 2 === 0 ? 'bg-white dark:bg-neutral-900' : 'bg-gray-50/80 dark:bg-neutral-800/80'}
                        hover:bg-blue-50/70 dark:hover:bg-blue-900/70
                        transition-all duration-300
                        cursor-pointer
                      `}
                      whileHover={{ scale: 1.01, x: 4 }}
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <TeamLogo
                            logoUrl={player.team_logo || player.logo_url}
                            teamName={player.team_name}
                            className="w-6 h-6 object-contain"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{player.team_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {player.nationality || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {player.age || 'N/A'}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        <AnimatePresence>
          {filteredPlayers.map((player, index) => (
            <motion.div
              key={player.id || `player-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              className={`
                bg-white dark:bg-neutral-800 rounded-xl shadow-md p-4
                border-2 border-transparent
                hover:border-secondary
                hover:shadow-lg
                transition-all duration-300
                cursor-pointer
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-heading font-bold text-gray-900 dark:text-white">
                    {player.player_name}
                  </h3>
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
                <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getPositionColor(player.position)}`}>
                  {getPositionAbbreviation(player.position)}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <TeamLogo
                    logoUrl={player.team_logo || player.logo_url}
                    teamName={player.team_name}
                    className="w-5 h-5 object-contain"
                  />
                  <span>{player.team_name}</span>
                </div>
                <div>Nationality: {player.nationality || 'N/A'}</div>
                <div>Age: {player.age || 'N/A'}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredPlayers.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-100 dark:bg-neutral-800 rounded-xl p-8 text-center"
        >
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            No players found matching your filters.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Players;
