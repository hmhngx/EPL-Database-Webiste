import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSpinner, FaChartLine, FaFutbol } from 'react-icons/fa';
import TeamLogo from '../components/TeamLogo';
import Breadcrumb from '../components/Breadcrumb';

const Predictor = () => {
  const [teams, setTeams] = useState([]);
  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);
  const [teamAStats, setTeamAStats] = useState(null);
  const [teamBStats, setTeamBStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);

  // Fetch all teams
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/clubs');
        if (!response.ok) throw new Error('Failed to fetch teams');
        const data = await response.json();
        setTeams(data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  // Fetch stats when team is selected
  useEffect(() => {
    if (teamA) {
      fetchTeamStats(teamA.team_id, setTeamAStats);
    } else {
      setTeamAStats(null);
    }
  }, [teamA]);

  useEffect(() => {
    if (teamB) {
      fetchTeamStats(teamB.team_id, setTeamBStats);
    } else {
      setTeamBStats(null);
    }
  }, [teamB]);

  const fetchTeamStats = async (teamId, setStats) => {
    try {
      const response = await fetch(`/api/clubs/${teamId}/stats`);
      if (!response.ok) throw new Error('Failed to fetch team stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching team stats:', err);
      setStats(null);
    }
  };

  const handleSimulate = async () => {
    if (!teamA || !teamB) {
      setError('Please select both teams');
      return;
    }

    if (!teamAStats || !teamBStats || !teamAStats.aggregates || !teamBStats.aggregates) {
      setError('Team statistics not available. Please wait for stats to load.');
      return;
    }

    setPredicting(true);
    setError(null);
    setPrediction(null);

    try {
      // Prepare team data for prediction
      const teamAData = {
        team_name: teamA.team_name,
        goals_for: teamAStats.aggregates.total_goals_for || 0,
        goals_against: teamAStats.aggregates.total_goals_against || 0,
        recent_form: teamAStats.aggregates.current_form || '',
        points: teamAStats.aggregates.total_points || 0,
        // Use goals_for as xG proxy if xG not available
        xg: teamAStats.aggregates.total_goals_for || 0
      };

      const teamBData = {
        team_name: teamB.team_name,
        goals_for: teamBStats.aggregates.total_goals_for || 0,
        goals_against: teamBStats.aggregates.total_goals_against || 0,
        recent_form: teamBStats.aggregates.current_form || '',
        points: teamBStats.aggregates.total_points || 0,
        // Use goals_for as xG proxy if xG not available
        xg: teamBStats.aggregates.total_goals_for || 0
      };

      const response = await fetch('/api/ai/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teamA: teamAData,
          teamB: teamBData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate prediction');
      }

      const data = await response.json();
      setPrediction(data.data);
    } catch (err) {
      console.error('Error generating prediction:', err);
      setError(err.message);
    } finally {
      setPredicting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a001c] via-[#0a0a0a] to-black flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-[#00FF85]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a001c] via-[#0a0a0a] to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[{ label: 'Match Predictor' }]} />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-6"
        >
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <FaChartLine className="text-4xl text-[#00FF85]" />
            </div>
            <div>
              <h1 className="text-3xl font-heading font-bold text-white mb-2 tracking-tight">
                AI Match Predictor
              </h1>
              <p className="text-white/60">
                Select two teams and get an AI-generated match prediction with tactical insights
              </p>
            </div>
          </div>
        </motion.div>

        {/* Team Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Team A Selection */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6"
          >
            <label className="block text-sm font-semibold text-white/80 mb-4">
              Team A (Home)
            </label>
            <div className="relative">
              <select
                value={teamA?.team_id || ''}
                onChange={(e) => {
                  const selectedTeamId = String(e.target.value);
                  const selected = teams.find(t => String(t.team_id) === selectedTeamId);
                  setTeamA(selected || null);
                  setPrediction(null);
                }}
                className="w-full bg-gray-900 border border-white/20 rounded-lg px-4 py-3 pr-10 text-white cursor-pointer focus:outline-none focus:border-[#00FF85] focus:ring-2 focus:ring-[#00FF85]/50 transition-all relative"
                style={{ 
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  backgroundImage: 'none'
                }}
              >
                <option value="" className="bg-gray-900 text-white">Select Team A</option>
                {teams.map((team) => (
                  <option key={String(team.team_id)} value={String(team.team_id)} className="bg-gray-900 text-white">
                    {team.team_name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none" style={{ zIndex: 1 }}>
                <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {teamA && (
                <div className="mt-4 flex items-center space-x-3">
                  <TeamLogo
                    logoUrl={teamA.logo_url}
                    teamName={teamA.team_name}
                    className="w-12 h-12 object-contain"
                  />
                  <span className="text-white font-semibold">{teamA.team_name}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Team B Selection */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6"
          >
            <label className="block text-sm font-semibold text-white/80 mb-4">
              Team B (Away)
            </label>
            <div className="relative">
              <select
                value={teamB?.team_id || ''}
                onChange={(e) => {
                  const selectedTeamId = String(e.target.value);
                  const selected = teams.find(t => String(t.team_id) === selectedTeamId);
                  setTeamB(selected || null);
                  setPrediction(null);
                }}
                className="w-full bg-gray-900 border border-white/20 rounded-lg px-4 py-3 pr-10 text-white cursor-pointer focus:outline-none focus:border-[#00FF85] focus:ring-2 focus:ring-[#00FF85]/50 transition-all relative"
                style={{ 
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  backgroundImage: 'none'
                }}
              >
                <option value="" className="bg-gray-900 text-white">Select Team B</option>
                {teams.map((team) => (
                  <option key={String(team.team_id)} value={String(team.team_id)} className="bg-gray-900 text-white">
                    {team.team_name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none" style={{ zIndex: 1 }}>
                <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {teamB && (
                <div className="mt-4 flex items-center space-x-3">
                  <TeamLogo
                    logoUrl={teamB.logo_url}
                    teamName={teamB.team_name}
                    className="w-12 h-12 object-contain"
                  />
                  <span className="text-white font-semibold">{teamB.team_name}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* SIMULATE Button */}
        <div className="flex justify-center mb-8">
          <motion.button
            onClick={handleSimulate}
            disabled={!teamA || !teamB || predicting}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              relative px-12 py-4 bg-gradient-to-r from-[#00FF85] to-[#00CC6A] 
              text-gray-900 font-bold text-xl rounded-xl
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-4 focus:ring-[#00FF85]/50
              transition-all duration-300
              ${predicting ? 'cursor-wait' : ''}
            `}
            style={{
              boxShadow: '0 0 30px rgba(0, 255, 133, 0.5)',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          >
            {predicting ? (
              <span className="flex items-center space-x-2">
                <FaSpinner className="animate-spin" />
                <span>Predicting...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <FaFutbol />
                <span>SIMULATE</span>
              </span>
            )}
          </motion.button>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 bg-red-500/20 backdrop-blur-md border border-red-500/50 rounded-xl p-4 text-red-200"
            >
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prediction Results */}
        <AnimatePresence>
          {prediction && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-6"
            >
              {/* Predicted Score */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 text-center">
                <h2 className="text-xl font-semibold text-white/80 mb-4">Predicted Score</h2>
                <div className="flex items-center justify-center space-x-6">
                  <div className="flex items-center space-x-3">
                    <TeamLogo
                      logoUrl={teamA?.logo_url}
                      teamName={teamA?.team_name}
                      className="w-16 h-16 object-contain"
                    />
                    <span className="text-4xl font-bold text-white">{prediction.predicted_score?.split('-')[0] || '0'}</span>
                  </div>
                  <span className="text-2xl text-white/60">-</span>
                  <div className="flex items-center space-x-3">
                    <span className="text-4xl font-bold text-white">{prediction.predicted_score?.split('-')[1] || '0'}</span>
                    <TeamLogo
                      logoUrl={teamB?.logo_url}
                      teamName={teamB?.team_name}
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Win Probability Bar */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-white/80 mb-4">Win Probability</h2>
                <div className="space-y-4">
                  {/* Home Win */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-white/70">
                        {teamA?.team_name} (Home)
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {prediction.win_probabilities?.home || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-6 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${prediction.win_probabilities?.home || 0}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-[#00FF85] to-[#00CC6A] rounded-full"
                      />
                    </div>
                  </div>

                  {/* Draw */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-white/70">Draw</span>
                      <span className="text-sm font-semibold text-white">
                        {prediction.win_probabilities?.draw || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-6 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${prediction.win_probabilities?.draw || 0}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                        className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
                      />
                    </div>
                  </div>

                  {/* Away Win */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-white/70">
                        {teamB?.team_name} (Away)
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {prediction.win_probabilities?.away || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-6 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${prediction.win_probabilities?.away || 0}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Tactical Outlook */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                }}
              >
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                  <FaChartLine className="text-[#00FF85]" />
                  <span>AI Tactical Outlook</span>
                </h2>
                <div className="space-y-3">
                  {prediction.tactical_keys && prediction.tactical_keys.length > 0 ? (
                    prediction.tactical_keys.map((key, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                        className="flex items-start space-x-3"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#00FF85]/20 flex items-center justify-center mt-1">
                          <span className="text-[#00FF85] font-bold text-sm">{index + 1}</span>
                        </div>
                        <p className="text-white/90 leading-relaxed flex-1">{key}</p>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-white/70">No tactical insights available.</p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Predictor;
