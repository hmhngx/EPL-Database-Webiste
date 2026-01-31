import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaTrophy, FaSpinner } from 'react-icons/fa';

/**
 * TopPerformers Component
 * Displays top 5 players by sofascore_rating in a leaderboard format
 * 
 * @param {Object} props
 * @param {string} props.clubId - Club/Team ID
 * @param {string} props.teamColor - Team color for styling
 */
const TopPerformers = ({ clubId, teamColor = '#38003C' }) => {
  const [topPerformers, setTopPerformers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clubId) return;

    const fetchTopPerformers = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/clubs/${clubId}/top-performers`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.data) {
          setTopPerformers(data.data);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching top performers:', err);
        setError(err.message || 'Failed to fetch top performers');
      } finally {
        setLoading(false);
      }
    };

    fetchTopPerformers();
  }, [clubId]);

  /**
   * Get position abbreviation
   */
  const getPositionAbbr = (position) => {
    const abbreviations = {
      'Goalkeeper': 'GK',
      'Defender': 'DF',
      'Midfielder': 'MF',
      'Forward': 'FW'
    };
    return abbreviations[position] || position?.substring(0, 2).toUpperCase() || 'N/A';
  };

  /**
   * Get rating badge color based on rating value
   */
  const getRatingColor = (rating) => {
    if (rating >= 7.5) return 'bg-green-500 text-white';
    if (rating >= 7.0) return 'bg-yellow-500 text-white';
    return 'bg-gray-400 text-white';
  };

  /**
   * Get rank color for top 3
   */
  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return 'text-yellow-500'; // Gold
      case 2: return 'text-gray-400'; // Silver
      case 3: return 'text-amber-600'; // Bronze
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  /**
   * Scroll to squad table
   */
  const scrollToSquad = () => {
    const squadSection = document.getElementById('squad-section');
    if (squadSection) {
      squadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 dark:bg-neutral-800/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-white/10 dark:border-neutral-700/50"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          <div className="h-6 w-32 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="mb-3 h-16 bg-gray-200/50 dark:bg-gray-700/50 rounded-lg animate-pulse"></div>
        ))}
      </motion.div>
    );
  }

  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 dark:bg-neutral-800/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-white/10 dark:border-neutral-700/50"
      >
        <div className="text-rose-600 dark:text-rose-400 text-sm">
          <p className="font-semibold">Error loading top performers</p>
          <p className="mt-1">{error}</p>
        </div>
      </motion.div>
    );
  }

  // Empty state
  if (!topPerformers || topPerformers.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 min-h-[550px]"
      >
        <div className="flex items-center gap-3 mb-6">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${teamColor}20` }}
          >
            <FaTrophy 
              className="text-xl"
              style={{ color: teamColor }}
            />
          </div>
          <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
            Top Performers
          </h2>
        </div>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p>No player ratings available</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 min-h-[550px] h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${teamColor}20` }}
        >
          <FaTrophy 
            className="text-xl"
            style={{ color: teamColor }}
          />
        </div>
        <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
          Top Performers
        </h2>
      </div>

      {/* Leaderboard */}
      <div className="space-y-2 mb-4 flex-1">
        <AnimatePresence>
          {topPerformers.map((player, index) => {
            const rank = index + 1;
            const rating = parseFloat(player.sofascore_rating) || 0;
            
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={`/players/${player.id}`}
                  className="block group"
                >
                  <motion.div
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 dark:bg-neutral-700/30 border border-transparent hover:border-white/20 dark:hover:border-neutral-600/50 transition-all cursor-pointer"
                    whileHover={{ scale: 1.02, x: 4 }}
                    style={{
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    {/* Rank Number */}
                    <div className={`text-2xl font-bold min-w-[2rem] text-center ${getRankColor(rank)}`}>
                      {rank}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary dark:group-hover:text-accent transition-colors">
                        {player.player_name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {getPositionAbbr(player.position)}
                      </div>
                    </div>

                    {/* Rating Badge */}
                    <div className={`px-3 py-1 rounded-full text-sm font-bold ${getRatingColor(rating)}`}>
                      {rating.toFixed(1)}
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* View All Players Button */}
      <motion.button
        onClick={scrollToSquad}
        className="w-full py-2 px-4 rounded-lg text-sm font-semibold transition-all"
        style={{
          backgroundColor: `${teamColor}20`,
          color: teamColor,
          border: `1px solid ${teamColor}40`
        }}
        whileHover={{ 
          scale: 1.02,
          backgroundColor: `${teamColor}30`
        }}
        whileTap={{ scale: 0.98 }}
      >
        View All Players
      </motion.button>
    </motion.div>
  );
};

export default TopPerformers;
