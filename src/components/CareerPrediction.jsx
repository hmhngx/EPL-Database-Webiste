import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaRobot, FaSpinner, FaUsers, FaTimes } from 'react-icons/fa';
import ProjectedValueChart from './ProjectedValueChart';
import TeamLogo from './TeamLogo';

/**
 * CareerPrediction Component
 * Displays AI-powered career path prediction for a player
 * Includes age-curve analysis, similar players, and market value projections
 * 
 * @param {Object} props
 * @param {string} props.playerId - Player ID to analyze
 * @param {Function} props.onClose - Callback when closing the prediction
 */
const CareerPrediction = ({ playerId, onClose }) => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch prediction on mount
  const fetchPrediction = async () => {
    if (!playerId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/scout/predict/${playerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to generate prediction');
      }

      const result = await response.json();
      setPrediction(result.data);
    } catch (err) {
      console.error('Error fetching career prediction:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when component mounts
  useEffect(() => {
    fetchPrediction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-8 flex flex-col items-center space-y-4">
          <FaSpinner className="animate-spin text-5xl text-[#00FF85]" />
          <p className="text-white text-lg">Analyzing career trajectory...</p>
          <p className="text-white/60 text-sm">This may take 10-15 seconds</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="bg-red-500/20 backdrop-blur-md border border-red-500/50 rounded-xl p-6 max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-red-200 font-bold text-lg mb-2">Error Loading Prediction</h3>
          <p className="text-red-200/80 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-500/30 hover:bg-red-500/50 rounded-lg text-white transition-all"
          >
            Close
          </button>
        </div>
      </motion.div>
    );
  }

  if (!prediction) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={fetchPrediction}
            className="w-full px-6 py-3 bg-[#00FF85] hover:bg-[#00FF85]/80 rounded-lg text-black font-bold transition-all"
          >
            Generate Career Prediction
          </button>
          <button
            onClick={onClose}
            className="w-full mt-3 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    );
  }

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
        className="bg-gradient-to-br from-[#1a001c] to-black border border-white/20 rounded-xl shadow-2xl max-w-5xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-[#00FF85]/10 rounded-lg">
              <FaRobot className="text-3xl text-[#00FF85]" />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-bold text-white">
                ScoutGPT Career Path Predictor
              </h2>
              <p className="text-white/60 text-sm">
                {prediction.player.name} • {prediction.player.position} • Age {prediction.player.age}
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

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Projected Value Chart */}
          <ProjectedValueChart
            projections={prediction.marketProjections}
            player={prediction.player}
            ageCurve={prediction.ageCurve}
          />

          {/* Historical Precedents */}
          {prediction.similarPlayers && prediction.similarPlayers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6"
            >
              <div className="flex items-center space-x-3 mb-4">
                <FaUsers className="text-xl text-[#00FF85]" />
                <h3 className="text-lg font-heading font-bold text-white">
                  Historical Precedents
                </h3>
              </div>
              <p className="text-white/60 text-sm mb-4">
                Players with similar statistical profiles at this age
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {prediction.similarPlayers.map((sp, idx) => (
                  <div
                    key={sp.id}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-[#00FF85]/30 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <TeamLogo
                        logoUrl={sp.logo_url}
                        teamName={sp.team_name}
                        className="w-8 h-8"
                      />
                      <span className="text-[#00FF85] text-sm font-semibold">
                        {sp.similarity_percentage} match
                      </span>
                    </div>
                    <h4 className="text-white font-semibold mb-1">{sp.player_name}</h4>
                    <p className="text-white/60 text-xs mb-2">
                      {sp.team_name} • Age {sp.age}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-white/50">Rating</p>
                        <p className="text-white font-semibold">{sp.sofascore_rating}</p>
                      </div>
                      <div>
                        <p className="text-white/50">Goals</p>
                        <p className="text-white font-semibold">{sp.goals || 0}</p>
                      </div>
                      <div>
                        <p className="text-white/50">Assists</p>
                        <p className="text-white font-semibold">{sp.assists || 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* AI Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <FaRobot className="text-xl text-[#00FF85]" />
              <h3 className="text-lg font-heading font-bold text-white">
                AI Career Path Analysis
              </h3>
            </div>

            <div className="prose prose-invert max-w-none">
              <div className="text-white/80 whitespace-pre-line leading-relaxed">
                {prediction.analysis}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-all"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CareerPrediction;
