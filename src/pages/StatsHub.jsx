import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaSpinner, FaTrophy, FaMedal } from 'react-icons/fa';
import TeamLogo from '../components/TeamLogo';
import Breadcrumb from '../components/Breadcrumb';

// Categories configuration - defined outside component to avoid dependency issues
const categories = [
    {
      key: 'goals',
      name: 'Golden Boot',
      description: 'Top Goalscorers',
      icon: '⚽',
      statLabel: 'Goals'
    },
    {
      key: 'assists',
      name: 'Playmaker',
      description: 'Most Assists',
      icon: '🎯',
      statLabel: 'Assists'
    },
    {
      key: 'xg',
      name: 'Understat Kings',
      description: 'Highest xG',
      icon: '📊',
      statLabel: 'xG'
    },
    {
      key: 'sofascore_rating',
      name: 'Top Rated',
      description: 'SofaScore Rating',
      icon: '⭐',
      statLabel: 'Rating'
    },
    {
      key: 'progressive_passes',
      name: 'Progressors',
      description: 'Progressive Passes',
      icon: '🚀',
      statLabel: 'Passes'
    },
    {
      key: 'appearances',
      name: 'Iron Men',
      description: 'Most Appearances',
      icon: '💪',
      statLabel: 'Apps'
    }
  ];

const StatsHub = () => {
  const [leaderboards, setLeaderboards] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllLeaderboards = async () => {
      try {
        setLoading(true);
        setError(null);

        const promises = categories.map(category =>
          fetch(`/api/players/top?category=${category.key}`)
            .then(res => {
              if (!res.ok) {
                console.error(`Failed to fetch ${category.name}:`, res.status, res.statusText);
                return { category: category.key, data: [], error: true };
              }
              return res.json();
            })
            .then(data => ({ 
              category: category.key, 
              data: data.data || [],
              error: data.error || false
            }))
            .catch(err => {
              console.error(`Error fetching ${category.name}:`, err);
              return { category: category.key, data: [], error: true };
            })
        );

        const results = await Promise.allSettled(promises);
        const leaderboardMap = {};
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const { category, data } = result.value;
            leaderboardMap[category] = data;
          } else {
            // If a promise was rejected, use empty array for that category
            const category = categories[index].key;
            leaderboardMap[category] = [];
            console.error(`Failed to load leaderboard for ${categories[index].name}:`, result.reason);
          }
        });

        setLeaderboards(leaderboardMap);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllLeaderboards();
  }, []);

  const getMedalColor = (rank) => {
    if (rank === 1) return 'text-[#FFD700]'; // Gold
    if (rank === 2) return 'text-[#C0C0C0]'; // Silver
    if (rank === 3) return 'text-[#CD7F32]'; // Bronze
    return 'text-white/60';
  };


  const formatStatValue = (value, category) => {
    if (value == null) return 'N/A';
    
    // For ratings, show 2 decimal places
    if (category === 'sofascore_rating') {
      return Number(value).toFixed(2);
    }
    
    // For xG, show 2 decimal places
    if (category === 'xg') {
      return Number(value).toFixed(2);
    }
    
    // For others, show as integer
    return Math.round(Number(value));
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

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a001c] via-[#0a0a0a] to-black flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-[#00FF85]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a001c] via-[#0a0a0a] to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-500/20 backdrop-blur-md border border-red-500/50 rounded-xl p-6 text-red-200">
            <p className="font-bold text-lg mb-2">Error loading leaderboards</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a001c] via-[#0a0a0a] to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[{ label: 'Stats Hub' }]} />
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-6"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <FaTrophy className="text-4xl text-[#00FF85]" />
              </div>
              <div>
                <h1 className="text-3xl font-heading font-bold text-white mb-2 tracking-tight">
                  League Statistical Hub
                </h1>
                <p className="text-white/60">
                  Premier League Season Leaderboards
                </p>
              </div>
            </div>
          </motion.div>

          {/* Leaderboards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, categoryIndex) => {
              const players = leaderboards[category.key] || [];
              
              return (
                <motion.div
                  key={category.key}
                  variants={cardVariants}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: categoryIndex * 0.1 }}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="bg-white/5 p-4 border-b border-white/10">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{category.icon}</span>
                      <div>
                        <h2 className="text-xl font-heading font-bold text-white tracking-tight">
                          {category.name}
                        </h2>
                        <p className="text-sm text-white/60">
                          {category.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Leaderboard List */}
                  <div className="divide-y divide-white/10">
                    {players.length === 0 ? (
                      <div className="p-6 text-center text-white/60">
                        No data available
                      </div>
                    ) : (
                      players.map((player, index) => {
                        const rank = player.rank || index + 1;
                        const isTopThree = rank <= 3;
                        
                        return (
                          <motion.div
                            key={player.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: (categoryIndex * 0.1) + (index * 0.05) }}
                            className={`
                              p-4 hover:bg-white/5 transition-colors duration-200
                              ${isTopThree ? 'border-l-4' : ''}
                              ${rank === 1 ? 'border-l-[#FFD700]' : rank === 2 ? 'border-l-[#C0C0C0]' : rank === 3 ? 'border-l-[#CD7F32]' : ''}
                            `}
                          >
                            <Link
                              to={`/players/${player.id}`}
                              className="flex items-center space-x-3 group"
                            >
                              {/* Rank with Shimmer Effect for Top 3 */}
                              <div className="flex-shrink-0 w-8 text-center">
                                {isTopThree ? (
                                  <motion.div
                                    animate={{
                                      boxShadow: [
                                        '0 0 10px rgba(255, 215, 0, 0.5)',
                                        '0 0 20px rgba(255, 215, 0, 0.8)',
                                        '0 0 10px rgba(255, 215, 0, 0.5)',
                                      ],
                                    }}
                                    transition={{
                                      duration: 2,
                                      repeat: Infinity,
                                      ease: 'easeInOut',
                                    }}
                                  >
                                    <FaMedal className={`text-xl ${getMedalColor(rank)} drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]`} />
                                  </motion.div>
                                ) : (
                                  <span className="text-sm font-semibold text-white/60">
                                    {rank}
                                  </span>
                                )}
                              </div>

                              {/* Team Logo */}
                              <div className="flex-shrink-0">
                                <TeamLogo
                                  logoUrl={player.team_logo || player.logo_url}
                                  teamName={player.team_name}
                                  className="w-8 h-8 object-contain"
                                />
                              </div>

                              {/* Player Name */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white group-hover:text-[#00FF85] transition-colors truncate">
                                  {player.player_name}
                                </p>
                                <p className="text-xs text-white/50 truncate">
                                  {player.team_name}
                                </p>
                              </div>

                              {/* Stat Value */}
                              <div className="flex-shrink-0">
                                <span className="text-lg font-bold text-[#00FF85]">
                                  {formatStatValue(player.stat_value, category.key)}
                                </span>
                              </div>
                            </Link>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default StatsHub;
