import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { FaSpinner, FaFutbol, FaShare, FaTimes } from 'react-icons/fa';
import TeamLogo from '../components/TeamLogo';
import Breadcrumb from '../components/Breadcrumb';

// Position requirements for Best XI (4-3-3 formation)
const POSITION_REQUIREMENTS = {
  GK: 1,   // Goalkeeper
  LB: 1,   // Left Back
  CB: 2,   // Center Backs
  RB: 1,   // Right Back
  LCM: 1,  // Left Center Midfielder
  CM: 1,   // Center Midfielder
  RCM: 1,  // Right Center Midfielder
  LW: 1,   // Left Wing
  ST: 1,   // Striker
  RW: 1    // Right Wing
};

// Exact 4-3-3 formation coordinates
const FORMATION_POSITIONS = {
  GK: { bottom: '5%', left: '50%' },
  LB: { bottom: '25%', left: '15%' },
  CB1: { bottom: '20%', left: '40%' },
  CB2: { bottom: '20%', left: '60%' },
  RB: { bottom: '25%', left: '85%' },
  LCM: { bottom: '50%', left: '25%' },
  CM: { bottom: '45%', left: '50%' },
  RCM: { bottom: '50%', left: '75%' },
  LW: { bottom: '80%', left: '20%' },
  ST: { bottom: '85%', left: '50%' },
  RW: { bottom: '80%', left: '80%' }
};

const BestXI = () => {
  const [players, setPlayers] = useState([]);
  const [bestXI, setBestXI] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isShareMode, setIsShareMode] = useState(false);
  const pitchRef = useRef(null);

  // Fetch top players by rating
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/players');
        if (!response.ok) {
          throw new Error('Failed to fetch players');
        }

        const data = await response.json();
        const allPlayers = data.data || [];

        const ratedPlayers = allPlayers
          .filter(p => p.sofascore_rating != null)
          .sort((a, b) => (b.sofascore_rating || 0) - (a.sofascore_rating || 0));

        setPlayers(ratedPlayers);
      } catch (err) {
        console.error('Error fetching players:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  // Algorithm to select Best XI (4-3-3 formation)
  useEffect(() => {
    if (players.length === 0) return;

    const selected = [];
    const usedIds = new Set();

    const findBestPlayer = (positionFilter, count) => {
      const found = [];
      for (const player of players) {
        if (found.length >= count) break;
        if (usedIds.has(player.id)) continue;

        let matches = false;
        if (positionFilter === 'Goalkeeper') {
          matches = player.position === 'Goalkeeper';
        } else if (positionFilter === 'Defender') {
          matches = player.position === 'Defender';
        } else if (positionFilter === 'Midfielder') {
          matches = player.position === 'Midfielder';
        } else if (positionFilter === 'Forward') {
          matches = player.position === 'Forward';
        }

        if (matches) {
          found.push(player);
          usedIds.add(player.id);
        }
      }
      return found;
    };

    // Select 1 Goalkeeper
    const goalkeepers = findBestPlayer('Goalkeeper', 1);
    if (goalkeepers.length > 0) {
      selected.push({ ...goalkeepers[0], pitchPosition: 'GK' });
    }

    // Select 4 Defenders (LB, CB1, CB2, RB)
    const defenders = findBestPlayer('Defender', 4);
    if (defenders.length >= 4) {
      selected.push(
        { ...defenders[0], pitchPosition: 'LB' },
        { ...defenders[1], pitchPosition: 'CB1' },
        { ...defenders[2], pitchPosition: 'CB2' },
        { ...defenders[3], pitchPosition: 'RB' }
      );
    } else {
      defenders.forEach((def, idx) => {
        const positions = ['LB', 'CB1', 'CB2', 'RB'];
        selected.push({ ...def, pitchPosition: positions[idx] || 'CB1' });
      });
    }

    // Select 3 Midfielders (LCM, CM, RCM)
    const midfielders = findBestPlayer('Midfielder', 3);
    if (midfielders.length >= 3) {
      selected.push(
        { ...midfielders[0], pitchPosition: 'LCM' },
        { ...midfielders[1], pitchPosition: 'CM' },
        { ...midfielders[2], pitchPosition: 'RCM' }
      );
    } else {
      midfielders.forEach((mf, idx) => {
        const positions = ['LCM', 'CM', 'RCM'];
        selected.push({ ...mf, pitchPosition: positions[idx] || 'CM' });
      });
    }

    // Select 3 Forwards (LW, ST, RW)
    const forwards = findBestPlayer('Forward', 3);
    if (forwards.length >= 3) {
      selected.push(
        { ...forwards[0], pitchPosition: 'LW' },
        { ...forwards[1], pitchPosition: 'ST' },
        { ...forwards[2], pitchPosition: 'RW' }
      );
    } else {
      forwards.forEach((fw, idx) => {
        const positions = ['LW', 'ST', 'RW'];
        selected.push({ ...fw, pitchPosition: positions[idx] || 'ST' });
      });
    }

    setBestXI(selected);
  }, [players]);

  // Get position for a player on the pitch
  const getPitchPosition = (player) => {
    return FORMATION_POSITIONS[player.pitchPosition] || FORMATION_POSITIONS.GK;
  };

  // Get tooltip position based on player's location on pitch
  const getTooltipPosition = (player) => {
    const position = getPitchPosition(player);
    const bottomPercent = parseFloat(position.bottom);
    
    // If player is in top half of pitch (forwards), show tooltip below
    if (bottomPercent > 60) {
      return {
        position: 'top-full',
        margin: 'mt-3',
        transform: 'translate(-50%, 0)'
      };
    }
    // For middle third (midfielders), check left/right side
    else if (bottomPercent > 35) {
      const leftPercent = parseFloat(position.left);
      // Left side - show tooltip to the right
      if (leftPercent < 40) {
        return {
          position: 'left-full',
          margin: 'ml-3',
          transform: 'translate(0, -50%)'
        };
      }
      // Right side - show tooltip to the left
      else if (leftPercent > 60) {
        return {
          position: 'right-full',
          margin: 'mr-3',
          transform: 'translate(0, -50%)'
        };
      }
      // Center - show above
      else {
        return {
          position: 'bottom-full',
          margin: 'mb-3',
          transform: 'translate(-50%, 0)'
        };
      }
    }
    // Bottom third (defenders/GK) - show tooltip above
    else {
      return {
        position: 'bottom-full',
        margin: 'mb-3',
        transform: 'translate(-50%, 0)'
      };
    }
  };

  // Handle share mode
  const handleShare = () => {
    setIsShareMode(true);
    // Hide UI elements for screenshot
    setTimeout(() => {
      if (pitchRef.current) {
        // The pitch is now ready for screenshot
        // User can use browser's screenshot tool or we could implement html2canvas
      }
    }, 100);
  };

  const handleExitShareMode = () => {
    setIsShareMode(false);
  };

  // Animation variants
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

  const playerVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0,
      y: 50
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20
      }
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
            <p className="font-bold text-lg mb-2">Error loading Best XI</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a001c] via-[#0a0a0a] to-black">
      <AnimatePresence>
        {!isShareMode && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          >
            <Breadcrumb items={[{ label: 'Best XI' }]} />
            
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 glass-hud-premium rounded-xl p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <FaFutbol className="text-4xl text-[#00FF85]" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-heading font-bold text-white mb-2 tracking-tight">
                      Team of the Season
                    </h1>
                    <p className="text-white/60">
                      Elite 4-3-3 formation with the highest-rated players
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleShare}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#00FF85]/20 hover:bg-[#00FF85]/30 border border-[#00FF85]/50 rounded-lg text-[#00FF85] transition-all"
                >
                  <FaShare />
                  <span>Share</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Football Pitch with 3D Perspective */}
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 pb-8">
        <div
          className="relative w-full max-w-6xl"
          style={{
            perspective: '1000px',
          }}
        >
          <motion.div
            ref={pitchRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative rounded-xl overflow-hidden shadow-2xl"
            style={{
              aspectRatio: '3/2',
              transform: 'rotateX(20deg)',
              transformOrigin: 'center bottom',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Mowing Pattern Background */}
            <div 
              className="absolute inset-0"
              style={{
                background: `
                  repeating-linear-gradient(
                    90deg,
                    #047857 0px,
                    #047857 40px,
                    #059669 40px,
                    #059669 80px
                  )
                `,
              }}
            />

            {/* Deep Emerald Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/60 via-emerald-800/80 to-emerald-900/60" />

            {/* Neon Green Outer Glow */}
            <div className="absolute inset-0 ring-4 ring-[#00FF85]/50 ring-offset-0 rounded-xl" />

            {/* Pitch Markings - SVG Style */}
            <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Center Line */}
              <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeWidth="0.3" opacity="0.9" />
              
              {/* Center Circle */}
              <circle cx="50" cy="50" r="16.67" fill="none" stroke="white" strokeWidth="0.3" opacity="0.9" />
              <circle cx="50" cy="50" r="0.5" fill="white" opacity="0.9" />
              
              {/* Bottom Penalty Area */}
              <rect x="30" y="75" width="40" height="25" fill="none" stroke="white" strokeWidth="0.3" opacity="0.9" />
              <rect x="41.67" y="83.33" width="16.67" height="16.67" fill="none" stroke="white" strokeWidth="0.3" opacity="0.9" />
              <circle cx="50" cy="91.67" r="0.5" fill="white" opacity="0.9" />
              
              {/* Top Penalty Area */}
              <rect x="30" y="0" width="40" height="25" fill="none" stroke="white" strokeWidth="0.3" opacity="0.9" />
              <rect x="41.67" y="0" width="16.67" height="16.67" fill="none" stroke="white" strokeWidth="0.3" opacity="0.9" />
              <circle cx="50" cy="8.33" r="0.5" fill="white" opacity="0.9" />
              
              {/* Corner Arcs */}
              <path d="M 0 0 Q 2 0 0 2" fill="none" stroke="white" strokeWidth="0.3" opacity="0.9" />
              <path d="M 100 0 Q 98 0 100 2" fill="none" stroke="white" strokeWidth="0.3" opacity="0.9" />
              <path d="M 0 100 Q 2 100 0 98" fill="none" stroke="white" strokeWidth="0.3" opacity="0.9" />
              <path d="M 100 100 Q 98 100 100 98" fill="none" stroke="white" strokeWidth="0.3" opacity="0.9" />
            </svg>

            {/* Player Nodes */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="absolute inset-0"
            >
              {bestXI.map((player) => {
                const position = getPitchPosition(player);
                const tooltipPos = getTooltipPosition(player);

                return (
                  <motion.div
                    key={player.id}
                    variants={playerVariants}
                    initial="hidden"
                    animate="visible"
                    className="absolute group"
                    style={{
                      bottom: position.bottom,
                      left: position.left,
                      transform: 'translate(-50%, 50%)',
                    }}
                  >
                    <Link to={`/players/${player.id}`}>
                      {/* Floating Disc Player Card */}
                      <motion.div
                        className="relative bg-white/10 backdrop-blur-md rounded-full border-2 border-white/20 shadow-[0_10px_20px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover:border-[#00FF85]"
                        style={{ width: '100px', height: '100px' }}
                        whileHover={{ scale: 1.1, y: -10, zIndex: 10 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="flex flex-col items-center justify-center h-full p-3">
                          {/* Team Logo (Large) */}
                          <TeamLogo
                            logoUrl={player.logo_url || player.team_logo}
                            teamName={player.team_name}
                            className="w-12 h-12 object-contain mb-1"
                          />
                          
                          {/* Player Name (Small, underneath) */}
                          <p className="text-xs font-semibold text-white truncate w-full text-center px-1">
                            {player.player_name?.split(' ').pop() || player.player_name}
                          </p>
                        </div>

                        {/* Gold Rating Badge (Top-Right) */}
                        <div className="absolute -top-1 -right-1 bg-gradient-to-br from-yellow-400 to-yellow-600 text-gray-900 text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg ring-2 ring-white/50">
                          {player.sofascore_rating != null ? Number(player.sofascore_rating).toFixed(1) : 'N/A'}
                        </div>
                      </motion.div>

                      {/* Tooltip on Hover - Intelligently Positioned */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`absolute ${tooltipPos.position} ${tooltipPos.margin} hidden group-hover:block z-20 pointer-events-none`}
                        style={{
                          left: tooltipPos.position.includes('left') || tooltipPos.position.includes('right') ? 'auto' : '50%',
                          top: tooltipPos.position.includes('left') || tooltipPos.position.includes('right') ? '50%' : 'auto',
                          transform: tooltipPos.transform
                        }}
                      >
                        <div className="bg-gray-900/95 backdrop-blur-md text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap border border-white/20">
                          <p className="font-bold">{player.player_name}</p>
                          <p className="text-[#00FF85]">{player.team_name}</p>
                          <p className="text-gray-400">Rating: {player.sofascore_rating != null ? Number(player.sofascore_rating).toFixed(1) : 'N/A'}</p>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Player List Below Pitch */}
      <AnimatePresence>
        {!isShareMode && bestXI.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8"
          >
            <div className="mt-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Best XI Squad</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bestXI.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                  >
                    <Link to={`/players/${player.id}`}>
                      <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors">
                        <TeamLogo
                          logoUrl={player.logo_url || player.team_logo}
                          teamName={player.team_name}
                          className="w-10 h-10 object-contain"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {player.player_name}
                          </p>
                          <p className="text-xs text-white/60 truncate">
                            {player.team_name} • {player.pitchPosition}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-[#00FF85]">
                            {player.sofascore_rating != null ? Number(player.sofascore_rating).toFixed(1) : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Mode Overlay */}
      <AnimatePresence>
        {isShareMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900/95 backdrop-blur-md border border-white/20 rounded-xl p-6 max-w-md mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Share Best XI</h3>
                <button
                  onClick={handleExitShareMode}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <FaTimes />
                </button>
              </div>
              <p className="text-white/80 mb-4">
                The UI has been hidden. Use your browser's screenshot tool (F12 → Screenshot) or right-click to save the pitch image.
              </p>
              <button
                onClick={handleExitShareMode}
                className="w-full px-4 py-2 bg-[#00FF85] hover:bg-[#00FF85]/80 text-gray-900 font-semibold rounded-lg transition-colors"
              >
                Exit Share Mode
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BestXI;
