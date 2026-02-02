import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaFutbol, FaHandPaper, FaBolt, FaTimes } from 'react-icons/fa';

/**
 * PitchMap Component - Interactive Tactical Positioning Visualizer
 * Displays player actions and heatmap on a soccer pitch
 * 
 * @param {Object} player - Player data with stats
 * @param {string} teamColor - Team primary color
 */
const PitchMap = ({ player, teamColor = '#00FF85' }) => {
  const [selectedAction, setSelectedAction] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(true);

  // Pitch dimensions (standard: 105m x 68m)
  const PITCH_WIDTH = 105;
  const PITCH_HEIGHT = 68;
  
  // SVG viewBox dimensions
  const SVG_WIDTH = 1050;
  const SVG_HEIGHT = 680;

  // Generate tactical positioning zones based on player position
  const generatePositionalZones = (position) => {
    const zones = [];
    
    // Base zones by position
    const positionZones = {
      'Goalkeeper': [
        { x: 5, y: 34, zone: 'Goal Area' },
        { x: 12, y: 34, zone: '6-yard box' }
      ],
      'Defender': [
        { x: 20, y: 17, zone: 'Left Back' },
        { x: 20, y: 34, zone: 'Center Back' },
        { x: 20, y: 51, zone: 'Right Back' },
        { x: 35, y: 34, zone: 'Defensive Third' }
      ],
      'Midfielder': [
        { x: 40, y: 17, zone: 'Left Mid' },
        { x: 45, y: 34, zone: 'Center Mid' },
        { x: 40, y: 51, zone: 'Right Mid' },
        { x: 55, y: 27, zone: 'Attacking Mid Left' },
        { x: 55, y: 41, zone: 'Attacking Mid Right' }
      ],
      'Forward': [
        { x: 70, y: 20, zone: 'Left Wing' },
        { x: 75, y: 34, zone: 'Striker' },
        { x: 70, y: 48, zone: 'Right Wing' },
        { x: 85, y: 34, zone: 'Box' }
      ]
    };

    return positionZones[position] || positionZones['Midfielder'];
  };

  // Generate key actions based on player stats (simulated)
  const keyActions = useMemo(() => {
    if (!player) return [];

    const actions = [];
    const zones = generatePositionalZones(player.position);
    
    // Goals
    const goals = player.goals || 0;
    for (let i = 0; i < Math.min(goals, 10); i++) {
      const baseX = 75 + Math.random() * 20; // Attack zone
      const baseY = 20 + Math.random() * 28;
      actions.push({
        type: 'goal',
        x: baseX,
        y: baseY,
        xg: 0.15 + Math.random() * 0.4,
        minute: Math.floor(Math.random() * 90),
        description: `Goal #${i + 1}`,
        icon: FaFutbol,
        color: '#ef4444'
      });
    }

    // Assists (Key Passes)
    const assists = player.assists || 0;
    for (let i = 0; i < Math.min(assists, 10); i++) {
      const baseX = 55 + Math.random() * 30;
      const baseY = 15 + Math.random() * 38;
      actions.push({
        type: 'assist',
        x: baseX,
        y: baseY,
        xg: 0.2 + Math.random() * 0.5,
        minute: Math.floor(Math.random() * 90),
        recipient: 'Teammate',
        description: `Assist #${i + 1}`,
        icon: FaHandPaper,
        color: '#3b82f6'
      });
    }

    // Progressive actions (based on progressive_passes)
    const progPasses = Math.min((player.progressive_passes || 0) / 10, 15);
    for (let i = 0; i < progPasses; i++) {
      const zoneIndex = Math.floor(Math.random() * zones.length);
      const zone = zones[zoneIndex];
      actions.push({
        type: 'progressive',
        x: zone.x + (Math.random() - 0.5) * 15,
        y: zone.y + (Math.random() - 0.5) * 15,
        xg: 0.05 + Math.random() * 0.15,
        minute: Math.floor(Math.random() * 90),
        description: `Key Pass`,
        icon: FaBolt,
        color: '#fbbf24'
      });
    }

    return actions;
  }, [player]);

  // Generate heatmap data
  const heatmapZones = useMemo(() => {
    if (!player) return [];

    const zones = generatePositionalZones(player.position);
    
    return zones.map(zone => {
      // Calculate intensity based on player stats
      const rating = player.sofascore_rating || 6.5;
      const intensity = Math.min((rating / 10) * 100, 100);
      
      return {
        x: zone.x,
        y: zone.y,
        radius: 12 + Math.random() * 8,
        intensity,
        zone: zone.zone
      };
    });
  }, [player]);

  // Scale coordinates to SVG
  const scaleX = (x) => (x / PITCH_WIDTH) * SVG_WIDTH;
  const scaleY = (y) => (y / PITCH_HEIGHT) * SVG_HEIGHT;

  if (!player) {
    return (
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
        <p className="text-white/60 text-center">No player data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white tracking-tight mb-2">
            Tactical Positioning
          </h2>
          <p className="text-sm text-white/60">
            Heat zones and key actions across the pitch
          </p>
        </div>
        
        {/* Toggle Heatmap */}
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            showHeatmap
              ? 'bg-[#00FF85]/20 text-[#00FF85] border border-[#00FF85]/30'
              : 'bg-white/5 text-white/60 border border-white/10'
          }`}
        >
          {showHeatmap ? 'Hide' : 'Show'} Heatmap
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-6 text-xs">
        <div className="flex items-center gap-2">
          <FaFutbol className="text-red-500" />
          <span className="text-white/80">Goals</span>
        </div>
        <div className="flex items-center gap-2">
          <FaHandPaper className="text-blue-500" />
          <span className="text-white/80">Assists</span>
        </div>
        <div className="flex items-center gap-2">
          <FaBolt className="text-yellow-500" />
          <span className="text-white/80">Key Actions</span>
        </div>
        {showHeatmap && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ background: `${teamColor}40` }}></div>
            <span className="text-white/80">Activity Zones</span>
          </div>
        )}
      </div>

      {/* Pitch Container */}
      <div className="relative w-full overflow-x-auto">
        <div className="min-w-[800px]">
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="w-full h-auto rounded-lg"
            style={{ minHeight: '500px' }}
          >
            {/* Pitch Background */}
            <defs>
              <pattern id="grass" patternUnits="userSpaceOnUse" width="20" height="20">
                <rect width="20" height="20" fill="#15803d" opacity="0.3" />
                <rect width="10" height="20" fill="#166534" opacity="0.2" />
              </pattern>
              
              {/* Radial gradient for heatmap */}
              <radialGradient id="heatGradient">
                <stop offset="0%" stopColor={teamColor} stopOpacity="0.6" />
                <stop offset="50%" stopColor={teamColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={teamColor} stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Grass background */}
            <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#grass)" />
            <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="#15803d" opacity="0.4" />

            {/* Pitch outline */}
            <rect
              x="50"
              y="50"
              width={SVG_WIDTH - 100}
              height={SVG_HEIGHT - 100}
              fill="none"
              stroke="white"
              strokeWidth="3"
              opacity="0.8"
            />

            {/* Center line */}
            <line
              x1={SVG_WIDTH / 2}
              y1="50"
              x2={SVG_WIDTH / 2}
              y2={SVG_HEIGHT - 50}
              stroke="white"
              strokeWidth="3"
              opacity="0.8"
            />

            {/* Center circle */}
            <circle
              cx={SVG_WIDTH / 2}
              cy={SVG_HEIGHT / 2}
              r="91.5"
              fill="none"
              stroke="white"
              strokeWidth="3"
              opacity="0.8"
            />
            <circle
              cx={SVG_WIDTH / 2}
              cy={SVG_HEIGHT / 2}
              r="5"
              fill="white"
              opacity="0.8"
            />

            {/* Left penalty area */}
            <rect
              x="50"
              y={(SVG_HEIGHT - 403) / 2}
              width="165"
              height="403"
              fill="none"
              stroke="white"
              strokeWidth="3"
              opacity="0.8"
            />

            {/* Left goal area */}
            <rect
              x="50"
              y={(SVG_HEIGHT - 183) / 2}
              width="55"
              height="183"
              fill="none"
              stroke="white"
              strokeWidth="3"
              opacity="0.8"
            />

            {/* Left goal */}
            <rect
              x="30"
              y={(SVG_HEIGHT - 73) / 2}
              width="20"
              height="73"
              fill="white"
              opacity="0.2"
              stroke="white"
              strokeWidth="2"
            />

            {/* Right penalty area */}
            <rect
              x={SVG_WIDTH - 215}
              y={(SVG_HEIGHT - 403) / 2}
              width="165"
              height="403"
              fill="none"
              stroke="white"
              strokeWidth="3"
              opacity="0.8"
            />

            {/* Right goal area */}
            <rect
              x={SVG_WIDTH - 105}
              y={(SVG_HEIGHT - 183) / 2}
              width="55"
              height="183"
              fill="none"
              stroke="white"
              strokeWidth="3"
              opacity="0.8"
            />

            {/* Right goal */}
            <rect
              x={SVG_WIDTH - 50}
              y={(SVG_HEIGHT - 73) / 2}
              width="20"
              height="73"
              fill="white"
              opacity="0.2"
              stroke="white"
              strokeWidth="2"
            />

            {/* Penalty spots */}
            <circle cx="165" cy={SVG_HEIGHT / 2} r="3" fill="white" opacity="0.8" />
            <circle cx={SVG_WIDTH - 165} cy={SVG_HEIGHT / 2} r="3" fill="white" opacity="0.8" />

            {/* Heatmap zones */}
            {showHeatmap && heatmapZones.map((zone, idx) => (
              <g key={`zone-${idx}`}>
                <circle
                  cx={scaleX(zone.x)}
                  cy={scaleY(zone.y)}
                  r={zone.radius * 10}
                  fill="url(#heatGradient)"
                  opacity={zone.intensity / 100}
                >
                  <title>{zone.zone} - Activity: {zone.intensity.toFixed(0)}%</title>
                </circle>
              </g>
            ))}

            {/* Key Actions */}
            {keyActions.map((action, idx) => {
              const Icon = action.icon;
              const size = 8 + action.xg * 15;
              
              return (
                <g key={`action-${idx}`}>
                  {/* Action marker */}
                  <motion.circle
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                    cx={scaleX(action.x)}
                    cy={scaleY(action.y)}
                    r={size}
                    fill={action.color}
                    stroke="white"
                    strokeWidth="2"
                    opacity="0.9"
                    className="cursor-pointer hover:opacity-100"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                    onClick={() => setSelectedAction(action)}
                  >
                    <title>
                      {action.description}
                      {action.type === 'assist' && ` → ${action.recipient}`}
                      {` | xG: ${action.xg.toFixed(2)} | ${action.minute}'`}
                    </title>
                  </motion.circle>
                  
                  {/* Inner dot */}
                  <circle
                    cx={scaleX(action.x)}
                    cy={scaleY(action.y)}
                    r="2"
                    fill="white"
                  />
                </g>
              );
            })}

            {/* Position labels */}
            <text
              x="100"
              y="35"
              fill="white"
              fontSize="14"
              fontWeight="bold"
              opacity="0.6"
            >
              DEF
            </text>
            <text
              x={SVG_WIDTH / 2 - 20}
              y="35"
              fill="white"
              fontSize="14"
              fontWeight="bold"
              opacity="0.6"
            >
              MID
            </text>
            <text
              x={SVG_WIDTH - 120}
              y="35"
              fill="white"
              fontSize="14"
              fontWeight="bold"
              opacity="0.6"
            >
              ATT
            </text>
          </svg>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-500">
            {keyActions.filter(a => a.type === 'goal').length}
          </div>
          <div className="text-xs text-white/60 mt-1">Goals Mapped</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-500">
            {keyActions.filter(a => a.type === 'assist').length}
          </div>
          <div className="text-xs text-white/60 mt-1">Assists Mapped</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-500">
            {keyActions.filter(a => a.type === 'progressive').length}
          </div>
          <div className="text-xs text-white/60 mt-1">Key Actions</div>
        </div>
      </div>

      {/* Action Detail Modal */}
      <AnimatePresence>
        {selectedAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAction(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-[#1a001c] to-[#0a0a0a] border border-white/20 rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-3 rounded-full"
                    style={{ backgroundColor: `${selectedAction.color}20` }}
                  >
                    <selectedAction.icon 
                      className="text-2xl"
                      style={{ color: selectedAction.color }}
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {selectedAction.description}
                    </h3>
                    <p className="text-sm text-white/60">
                      {selectedAction.type.charAt(0).toUpperCase() + selectedAction.type.slice(1)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAction(null)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-white/60 text-sm">Action Type</span>
                  <span className="text-white font-semibold capitalize">
                    {selectedAction.type}
                  </span>
                </div>
                
                {selectedAction.recipient && (
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-white/60 text-sm">Recipient</span>
                    <span className="text-white font-semibold">
                      {selectedAction.recipient}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-white/60 text-sm">Expected Goal (xG)</span>
                  <span className="text-[#00FF85] font-semibold text-lg">
                    {selectedAction.xg.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="text-white/60 text-sm">Minute</span>
                  <span className="text-white font-semibold">
                    {selectedAction.minute}'
                  </span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-[#00FF85]/10 border border-[#00FF85]/30 rounded-lg">
                <p className="text-xs text-white/60 text-center">
                  Spatial coordinates simulated based on player position and stats
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Note */}
      <div className="mt-4 text-xs text-white/40 text-center">
        Tactical positioning estimated using zone logic and performance metrics. Hover over markers for details.
      </div>
    </div>
  );
};

export default PitchMap;
