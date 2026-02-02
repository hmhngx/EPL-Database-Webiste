import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaRobot, FaSpinner, FaExchangeAlt, FaTimes, FaChartLine } from 'react-icons/fa';
import TeamLogo from './TeamLogo';
import ProjectedValueChart from './ProjectedValueChart';

/**
 * PlayerComparisonModal Component
 * Compares two players for long-term signing decisions
 * Uses AI to provide squad fit recommendations
 * 
 * @param {Object} props
 * @param {string} props.playerId1 - First player ID
 * @param {string} props.playerId2 - Second player ID
 * @param {Function} props.onClose - Callback when closing
 */
const PlayerComparisonModal = ({ playerId1, playerId2, onClose }) => {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clubContext, setClubContext] = useState('');

  useEffect(() => {
    if (playerId1 && playerId2) {
      fetchComparison();
    }
  }, [playerId1, playerId2]);

  const fetchComparison = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/scout/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId1,
          playerId2,
          clubContext: clubContext || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate comparison');
      }

      const result = await response.json();
      setComparison(result.data);
    } catch (err) {
      console.error('Error fetching comparison:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    fetchComparison();
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-8 flex flex-col items-center space-y-4">
          <FaSpinner className="animate-spin text-5xl text-[#00FF85]" />
          <p className="text-white text-lg">Comparing players...</p>
          <p className="text-white/60 text-sm">Analyzing long-term value and squad fit</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="bg-red-500/20 backdrop-blur-md border border-red-500/50 rounded-xl p-6 max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-red-200 font-bold text-lg mb-2">Error Loading Comparison</h3>
          <p className="text-red-200/80 mb-4">{error}</p>
          <div className="flex space-x-3">
            <button
              onClick={handleRegenerate}
              className="flex-1 px-4 py-2 bg-red-500/30 hover:bg-red-500/50 rounded-lg text-white transition-all"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!comparison) {
    return null;
  }

  const { player1, player2 } = comparison;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-gradient-to-br from-[#1a001c] to-black border border-white/20 rounded-xl shadow-2xl max-w-7xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-[#00FF85]/10 rounded-lg">
                <FaExchangeAlt className="text-3xl text-[#00FF85]" />
              </div>
              <div>
                <h2 className="text-2xl font-heading font-bold text-white">
                  Long-Term Signing Comparison
                </h2>
                <p className="text-white/60 text-sm">
                  AI-powered analysis for squad fit and investment value
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-all text-white/70 hover:text-white"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>

          {/* Club Context Input */}
          <div className="mt-4">
            <label className="text-white/70 text-sm block mb-2">
              Club Context (Optional - e.g., "Arsenal needs a creative midfielder")
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={clubContext}
                onChange={(e) => setClubContext(e.target.value)}
                placeholder="Enter squad needs or tactical preferences..."
                className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#00FF85]/50"
              />
              <button
                onClick={handleRegenerate}
                disabled={loading}
                className="px-4 py-2 bg-[#00FF85]/20 hover:bg-[#00FF85]/30 border border-[#00FF85]/50 rounded-lg text-[#00FF85] transition-all disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Regenerate'}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Player Headers - Side by Side */}
          <div className="grid grid-cols-2 gap-6">
            {/* Player 1 */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <div className="flex items-center space-x-4 mb-4">
                <TeamLogo
                  logoUrl={player1.player.logo_url}
                  teamName={player1.player.team}
                  className="w-12 h-12"
                />
                <div>
                  <h3 className="text-xl font-bold text-white">{player1.player.name}</h3>
                  <p className="text-white/60 text-sm">
                    {player1.player.position} • {player1.player.team}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-white/50 text-xs">Age</p>
                  <p className="text-white font-semibold">{player1.player.age}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Phase</p>
                  <p className={`font-semibold ${
                    player1.ageCurve.currentPhase === 'development' ? 'text-blue-400' :
                    player1.ageCurve.currentPhase === 'peak' ? 'text-[#00FF85]' :
                    'text-orange-400'
                  }`}>
                    {player1.ageCurve.currentPhase}
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Peak Age</p>
                  <p className="text-white font-semibold">{player1.ageCurve.peakAge}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Years to Peak</p>
                  <p className="text-white font-semibold">{player1.ageCurve.yearsUntilPeak}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Current Value</p>
                  <p className="text-[#00FF85] font-bold">
                    €{player1.marketProjections[0].projectedValue.toFixed(1)}M
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Peak Value</p>
                  <p className="text-[#00FF85] font-bold">
                    €{Math.max(...player1.marketProjections.map(p => p.projectedValue)).toFixed(1)}M
                  </p>
                </div>
              </div>
            </div>

            {/* Player 2 */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
              <div className="flex items-center space-x-4 mb-4">
                <TeamLogo
                  logoUrl={player2.player.logo_url}
                  teamName={player2.player.team}
                  className="w-12 h-12"
                />
                <div>
                  <h3 className="text-xl font-bold text-white">{player2.player.name}</h3>
                  <p className="text-white/60 text-sm">
                    {player2.player.position} • {player2.player.team}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-white/50 text-xs">Age</p>
                  <p className="text-white font-semibold">{player2.player.age}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Phase</p>
                  <p className={`font-semibold ${
                    player2.ageCurve.currentPhase === 'development' ? 'text-blue-400' :
                    player2.ageCurve.currentPhase === 'peak' ? 'text-[#00FF85]' :
                    'text-orange-400'
                  }`}>
                    {player2.ageCurve.currentPhase}
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Peak Age</p>
                  <p className="text-white font-semibold">{player2.ageCurve.peakAge}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Years to Peak</p>
                  <p className="text-white font-semibold">{player2.ageCurve.yearsUntilPeak}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Current Value</p>
                  <p className="text-[#00FF85] font-bold">
                    €{player2.marketProjections[0].projectedValue.toFixed(1)}M
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Peak Value</p>
                  <p className="text-[#00FF85] font-bold">
                    €{Math.max(...player2.marketProjections.map(p => p.projectedValue)).toFixed(1)}M
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Market Value Projections - Side by Side */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-semibold mb-3 flex items-center space-x-2">
                <FaChartLine className="text-[#00FF85]" />
                <span>{player1.player.name} - 5 Year Projection</span>
              </h4>
              <ProjectedValueChart
                projections={player1.marketProjections}
                player={player1.player}
                ageCurve={player1.ageCurve}
              />
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 flex items-center space-x-2">
                <FaChartLine className="text-[#00FF85]" />
                <span>{player2.player.name} - 5 Year Projection</span>
              </h4>
              <ProjectedValueChart
                projections={player2.marketProjections}
                player={player2.player}
                ageCurve={player2.ageCurve}
              />
            </div>
          </div>

          {/* AI Comparison Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-[#00FF85]/10 to-purple-500/10 backdrop-blur-md border-2 border-[#00FF85]/30 rounded-xl p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <FaRobot className="text-2xl text-[#00FF85]" />
              <h3 className="text-xl font-heading font-bold text-white">
                AI Comparison & Recommendation
              </h3>
            </div>

            <div className="prose prose-invert max-w-none">
              <div className="text-white/90 whitespace-pre-line leading-relaxed">
                {comparison.comparison}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-end space-x-3">
          <button
            onClick={handleRegenerate}
            disabled={loading}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-all disabled:opacity-50"
          >
            Regenerate
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#00FF85] hover:bg-[#00FF85]/80 rounded-lg text-black font-bold transition-all"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PlayerComparisonModal;
