import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { FaSpinner, FaSearch, FaUser } from 'react-icons/fa';
import TeamLogo from '../components/TeamLogo';
import Breadcrumb from '../components/Breadcrumb';

const INSIGHT_TAGS = {
  goldenProspects: {
    id: 'goldenProspects',
    label: 'Golden Prospects',
    description: 'Age < 21, Rating > 7.0',
    filter: (player) => {
      const age = player.age;
      const rating = player.sofascore_rating;
      return age != null && age < 21 && rating != null && rating > 7.0;
    },
    highlightStat: 'sofascore_rating',
    highlightLabel: 'Rating'
  },
  ironWalls: {
    id: 'ironWalls',
    label: 'Iron Walls',
    description: 'Defenders with most Progressive Passes',
    filter: (player) => {
      return player.position === 'Defender' && 
             player.progressive_passes != null && 
             player.progressive_passes > 0;
    },
    highlightStat: 'progressive_passes',
    highlightLabel: 'Prog. Passes',
    sortBy: (a, b) => (b.progressive_passes || 0) - (a.progressive_passes || 0)
  },
  clinical: {
    id: 'clinical',
    label: 'Clinical',
    description: 'Goals > xG',
    filter: (player) => {
      const goals = player.goals || 0;
      const xg = player.xg || 0;
      return goals > xg && goals > 0;
    },
    highlightStat: 'goals',
    highlightLabel: 'Goals',
    secondaryStat: 'xg',
    secondaryLabel: 'xG'
  },
  creativeHubs: {
    id: 'creativeHubs',
    label: 'Creative Hubs',
    description: 'Top xAG',
    filter: (player) => {
      return player.xag != null && player.xag > 0;
    },
    highlightStat: 'xag',
    highlightLabel: 'xAG',
    sortBy: (a, b) => (b.xag || 0) - (a.xag || 0)
  }
};

const Scout = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTags, setActiveTags] = useState(new Set());

  // Fetch all players
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/players');
        if (!response.ok) throw new Error('Failed to fetch players');
        const data = await response.json();
        setPlayers(data.data || []);
      } catch (err) {
        console.error('Error fetching players:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  // Toggle tag
  const toggleTag = (tagId) => {
    setActiveTags(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  // Filter and sort players based on active tags
  const filteredPlayers = useMemo(() => {
    if (activeTags.size === 0) {
      return [];
    }

    let filtered = players;

    // Apply filters for all active tags (AND logic - player must match at least one tag)
    const tagFilters = Array.from(activeTags).map(tagId => INSIGHT_TAGS[tagId].filter);
    filtered = filtered.filter(player => 
      tagFilters.some(filter => filter(player))
    );

    // If multiple tags are active, prioritize sorting by the first active tag
    const firstActiveTag = Array.from(activeTags)[0];
    if (firstActiveTag && INSIGHT_TAGS[firstActiveTag].sortBy) {
      filtered.sort(INSIGHT_TAGS[firstActiveTag].sortBy);
    }

    return filtered;
  }, [players, activeTags]);

  // Get highlight stat for a player based on active tags
  const getHighlightStat = (player) => {
    // If only one tag is active, use its highlight stat
    if (activeTags.size === 1) {
      const tagId = Array.from(activeTags)[0];
      const tag = INSIGHT_TAGS[tagId];
      return {
        value: player[tag.highlightStat],
        label: tag.highlightLabel,
        stat: tag.highlightStat
      };
    }
    
    // If multiple tags, find the first matching tag and use its highlight
    for (const tagId of activeTags) {
      const tag = INSIGHT_TAGS[tagId];
      if (tag.filter(player)) {
        return {
          value: player[tag.highlightStat],
          label: tag.highlightLabel,
          stat: tag.highlightStat
        };
      }
    }
    
    return null;
  };

  // Format number with terminal style
  const formatTerminalNumber = (value) => {
    if (value == null || value === '') return 'N/A';
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return 'N/A';
    
    // For ratings, show 1 decimal place
    if (num < 10 && num % 1 !== 0) {
      return num.toFixed(1);
    }
    
    // For whole numbers, show as-is
    return Math.round(num).toString();
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
            <p className="font-bold text-lg mb-2">Error loading Scout</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a001c] via-[#0a0a0a] to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[{ label: 'Scout' }]} />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-6"
        >
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <FaSearch className="text-4xl text-[#00FF85]" />
            </div>
            <div>
              <h1 className="text-3xl font-heading font-bold text-white mb-2 tracking-tight">
                Scout Discovery Engine
              </h1>
              <p className="text-white/60">
                Advanced filtering interface for professional player scouting
              </p>
            </div>
          </div>
        </motion.div>

        {/* Insight Tags */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold text-white/80 mb-4">Insight Tags</h2>
          <div className="flex flex-wrap gap-3">
            {Object.values(INSIGHT_TAGS).map((tag) => {
              const isActive = activeTags.has(tag.id);
              return (
                <motion.button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    px-4 py-2 rounded-lg border-2 transition-all duration-300
                    font-semibold text-sm
                    ${isActive
                      ? 'bg-[#00FF85]/20 border-[#00FF85] text-[#00FF85] shadow-[0_0_15px_rgba(0,255,133,0.3)]'
                      : 'bg-white/5 border-white/20 text-white/70 hover:border-white/40 hover:text-white/90'
                    }
                  `}
                >
                  <div className="flex flex-col items-start">
                    <span>{tag.label}</span>
                    <span className={`text-xs mt-1 ${isActive ? 'text-[#00FF85]/80' : 'text-white/50'}`}>
                      {tag.description}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Results Count */}
        {activeTags.size > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <p className="text-white/60">
              Found <span className="text-[#00FF85] font-bold">{filteredPlayers.length}</span> players matching selected criteria
            </p>
          </motion.div>
        )}

        {/* Results Grid */}
        {activeTags.size === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl"
          >
            <FaSearch className="text-6xl text-white/20 mx-auto mb-4" />
            <p className="text-white/60 text-lg">
              Select one or more insight tags to discover players
            </p>
          </motion.div>
        ) : filteredPlayers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl"
          >
            <FaUser className="text-6xl text-white/20 mx-auto mb-4" />
            <p className="text-white/60 text-lg">
              No players match the selected criteria
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
          >
            <AnimatePresence>
              {filteredPlayers.map((player, index) => {
                const highlight = getHighlightStat(player);
                const tag = activeTags.size === 1 
                  ? INSIGHT_TAGS[Array.from(activeTags)[0]]
                  : Object.values(INSIGHT_TAGS).find(t => t.filter(player));

                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <Link to={`/players/${player.id}`}>
                      <div className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-3 hover:border-[#00FF85]/50 hover:bg-white/10 transition-all duration-300 cursor-pointer h-full flex flex-col">
                        {/* Team Logo */}
                        <div className="flex justify-center mb-2">
                          <TeamLogo
                            logoUrl={player.logo_url || player.team_logo}
                            teamName={player.team_name}
                            className="w-10 h-10 object-contain"
                          />
                        </div>

                        {/* Player Name */}
                        <h3 className="text-xs font-semibold text-white text-center mb-2 truncate">
                          {player.player_name}
                        </h3>

                        {/* Highlight Stat */}
                        {highlight && (
                          <div className="mt-auto">
                            <div className="text-center mb-1">
                              <span className="text-[8px] text-white/50 uppercase tracking-wider">
                                {highlight.label}
                              </span>
                            </div>
                            <div className="text-center">
                              <span 
                                className="text-2xl font-bold text-[#00FF85]"
                                style={{
                                  fontFamily: '"Courier New", "Monaco", "Consolas", monospace',
                                  textShadow: '0 0 10px rgba(0, 255, 133, 0.5)',
                                  letterSpacing: '0.05em'
                                }}
                              >
                                {formatTerminalNumber(highlight.value)}
                              </span>
                            </div>
                            
                            {/* Secondary stat for Clinical tag */}
                            {tag?.id === 'clinical' && tag.secondaryStat && (
                              <div className="text-center mt-1">
                                <span className="text-[8px] text-white/40">xG: </span>
                                <span 
                                  className="text-xs text-white/60"
                                  style={{
                                    fontFamily: '"Courier New", "Monaco", "Consolas", monospace'
                                  }}
                                >
                                  {formatTerminalNumber(player[tag.secondaryStat])}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Additional Info */}
                        <div className="mt-2 pt-2 border-t border-white/10">
                          <div className="flex justify-between text-[10px] text-white/50">
                            <span>{player.position}</span>
                            {player.age != null && (
                              <span>{player.age} yrs</span>
                            )}
                          </div>
                        </div>

                        {/* Hover Glow Effect */}
                        <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                          style={{
                            boxShadow: 'inset 0 0 20px rgba(0, 255, 133, 0.1)'
                          }}
                        />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Scout;
