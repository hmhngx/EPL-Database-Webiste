import { useState, useEffect, useMemo } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  generateSquadData,
  groupPlayersByPosition,
  calculateSquadIntegrity,
  calculateSquadStrengthDrop,
  calculateReplacementCost,
  assessBenchDepth,
  determineRoleCriticality,
  formatCurrency,
  calculateAttackerDropOff,
  calculateDefenderDropOff,
  getPrimaryStat
} from '../utils/RiskAnalysis';
import {
  FaExclamationTriangle,
  FaShieldAlt,
  FaUserInjured,
  FaChartLine,
  FaPoundSign,
  FaInfoCircle,
  FaToggleOn,
  FaToggleOff,
  FaUsers,
  FaTrophy,
  FaRobot,
  FaBolt
} from 'react-icons/fa';
import { GiSoccerBall, GiWhistle } from 'react-icons/gi';
import NeonTooltip from '../components/NeonTooltip';

const SquadRisk = () => {
  // State management
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [squadPlayers, setSquadPlayers] = useState([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [ragLoading, setRagLoading] = useState(false);
  const [absentPlayers, setAbsentPlayers] = useState(new Set());
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [squadInsights, setSquadInsights] = useState(null);
  const [error, setError] = useState(null);

  // Fetch teams on mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/clubs');
        if (response.data.success) {
          setTeams(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching teams:', error);
        setError('Failed to load teams. Please ensure the server is running.');
      }
    };

    fetchTeams();
  }, []);

  // Fetch squad data and RAG analysis when team is selected
  useEffect(() => {
    // Clear previous state when team changes
    if (!selectedTeam) {
      setSquadPlayers([]);
      setAbsentPlayers(new Set());
      setSelectedPlayer(null);
      setSquadInsights(null);
      setPlayerCount(0);
      setError(null);
      return;
    }

    const fetchSquadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch real player data from Supabase - including goals, assists, sofascore_rating
        const response = await axios.get('http://localhost:5000/api/players', {
          params: { team: selectedTeam }
        });

        if (response.data.success) {
          const players = response.data.data;
          setPlayerCount(players.length);
          
          // Use sanitized data generation (with real stats)
          const sanitizedSquad = generateSquadData(selectedTeam, players);
          
          if (sanitizedSquad.length === 0) {
            setError(`No player data found for ${selectedTeam}`);
            setSquadPlayers([]);
            return;
          }

          setSquadPlayers(sanitizedSquad);
          
          // Fetch RAG analysis for the squad
          fetchSquadAnalysis(selectedTeam, sanitizedSquad);
        } else {
          setError(`No data available for ${selectedTeam}`);
          setSquadPlayers([]);
        }
      } catch (error) {
        console.error('Error fetching squad data:', error);
        setError(`Failed to load squad data for ${selectedTeam}`);
        setSquadPlayers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSquadData();
    
    // Clear selections when team changes
    setAbsentPlayers(new Set());
    setSelectedPlayer(null);
  }, [selectedTeam]);

  // Fetch RAG analysis
  const fetchSquadAnalysis = async (clubName, players) => {
    setRagLoading(true);
    
    try {
      const response = await axios.post('http://localhost:5000/api/ai/squad-analysis', {
        clubName,
        players
      });

      if (response.data.success) {
        setSquadInsights(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching squad analysis:', error);
      setSquadInsights(null);
    } finally {
      setRagLoading(false);
    }
  };

  // Group players by position
  const groupedPlayers = useMemo(() => {
    return groupPlayersByPosition(squadPlayers);
  }, [squadPlayers]);

  // Calculate squad integrity with real data
  const squadIntegrity = useMemo(() => {
    return calculateSquadIntegrity(squadPlayers, absentPlayers);
  }, [squadPlayers, absentPlayers]);

  // Calculate xG impact (using RAG data if available)
  const xgImpact = useMemo(() => {
    if (!squadInsights?.xg_impact_estimate) {
      return null;
    }
    
    const { current_xg_per_90, without_pillar_xg_per_90, drop_percentage } = squadInsights.xg_impact_estimate;
    
    return {
      current: current_xg_per_90,
      withoutPillar: without_pillar_xg_per_90,
      dropPercentage: drop_percentage || ((current_xg_per_90 - without_pillar_xg_per_90) / current_xg_per_90 * 100).toFixed(0)
    };
  }, [squadInsights]);

  // Toggle absence
  const toggleAbsence = (playerId) => {
    setAbsentPlayers(prev => {
      const updated = new Set(prev);
      if (updated.has(playerId)) {
        updated.delete(playerId);
      } else {
        updated.add(playerId);
      }
      return updated;
    });
  };

  // Select player for impact analysis
  const selectPlayer = (player) => {
    setSelectedPlayer(player);
  };

  // Get integrity color
  const getIntegrityColor = (value) => {
    if (value >= 80) return '#00FF85';
    if (value >= 60) return '#FFD700';
    if (value >= 40) return '#FF6B00';
    return '#FF0000';
  };

  // Get risk color
  const getRiskColor = (score) => {
    if (score >= 80) return 'text-red-500 bg-red-500/20 border-red-500/30';
    if (score >= 60) return 'text-orange-500 bg-orange-500/20 border-orange-500/30';
    if (score >= 40) return 'text-yellow-500 bg-yellow-500/20 border-yellow-500/30';
    return 'text-green-500 bg-green-500/20 border-green-500/30';
  };

  // Get criticality index for a player (from RAG)
  const getCriticalityIndex = (playerName) => {
    if (!squadInsights?.player_criticality_map) return null;
    
    const playerData = squadInsights.player_criticality_map[playerName];
    return playerData ? playerData.criticality_index : null;
  };

  // Get tactical dependency note (from RAG)
  const getTacticalDependency = (playerName) => {
    if (!squadInsights?.player_criticality_map) return null;
    
    const playerData = squadInsights.player_criticality_map[playerName];
    return playerData ? playerData.tactical_dependency : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center space-x-3 mb-4">
          <GiWhistle className="text-[#00FF85] text-3xl" />
          <h1 className="text-4xl font-bold text-white">Tactical Risk Blueprint</h1>
        </div>
        <p className="text-gray-400 text-lg">
          Real-time squad analysis powered by Supabase stats and AI recruitment insights
        </p>
      </motion.div>

      {/* Team Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-[#00FF85]/20"
      >
        <label className="block text-white font-semibold mb-3">
          <FaShieldAlt className="inline mr-2 text-[#00FF85]" />
          Select Team
        </label>
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="w-full md:w-1/2 px-4 py-3 bg-gray-900 border border-[#00FF85]/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00FF85] focus:border-[#00FF85] transition-all"
          disabled={loading}
        >
          <option value="">-- Please Select a Team --</option>
          {teams.map((team) => (
            <option key={team.team_id} value={team.team_name}>
              {team.team_name}
            </option>
          ))}
        </select>
      </motion.div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-900/20 border border-red-500/50 rounded-xl p-6 mb-6"
        >
          <div className="flex items-center space-x-3">
            <FaExclamationTriangle className="text-red-500 text-2xl" />
            <p className="text-white text-lg">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Loading State with Player Count */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#00FF85] border-t-transparent mb-4"></div>
          <p className="text-gray-400 text-lg font-semibold">Thinking...</p>
          <p className="text-gray-500 text-sm mt-2">
            Analyzing {playerCount > 0 ? playerCount : ''} real-time stats from database...
          </p>
        </div>
      )}

      {/* RAG Analysis Loading */}
      {ragLoading && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-[#00FF85]/20"
        >
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#00FF85] border-t-transparent"></div>
            <div>
              <p className="text-white font-semibold" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                AI Recruitment Analysis in Progress...
              </p>
              <p className="text-gray-400 text-sm" style={{ fontFamily: 'Merriweather, serif' }}>
                Processing {squadPlayers.length} player profiles and identifying irreplaceable assets
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Squad Integrity Bar */}
      {!loading && !error && squadPlayers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-[#00FF85]/20"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <FaTrophy className="text-[#00FF85] text-2xl" />
              <h2 className="text-2xl font-bold text-white">Squad Integrity</h2>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold" style={{ 
                color: getIntegrityColor(squadIntegrity),
                fontFamily: 'Chakra Petch, sans-serif'
              }}>
                {squadIntegrity.toFixed(0)}%
              </div>
              <p className="text-gray-400 text-sm">Current Strength</p>
            </div>
          </div>
          
          {/* Integrity Bar */}
          <div className="relative w-full h-8 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: `${squadIntegrity}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{
                backgroundColor: getIntegrityColor(squadIntegrity),
                boxShadow: `0 0 20px ${getIntegrityColor(squadIntegrity)}50`
              }}
            />
          </div>
          
          {absentPlayers.size > 0 && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 text-red-400">
                <FaUserInjured />
                <span>{absentPlayers.size} player(s) simulated absent</span>
              </div>
              {xgImpact && (
                <div className="text-gray-300 text-sm">
                  <span className="text-[#00FF85]" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                    Team xG/90:
                  </span>{' '}
                  <span style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                    {xgImpact.current} → {xgImpact.withoutPillar}{' '}
                  </span>
                  <span className="text-red-400" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                    (-{xgImpact.dropPercentage}%)
                  </span>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* AI Recruitment Assessment */}
      {!loading && squadInsights && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-800/70 to-gray-900/70 backdrop-blur-sm rounded-xl p-8 mb-6 border-2 border-[#00FF85]/30"
        >
          <div className="flex items-center space-x-3 mb-6">
            <FaRobot className="text-[#00FF85] text-3xl" />
            <h2 className="text-2xl font-bold text-white">AI Recruitment Assessment</h2>
          </div>

          {/* Risk Assessment Narrative (Merriweather) */}
          <div className="bg-gray-900/50 rounded-lg p-6 mb-6 border border-gray-700">
            <p className="text-gray-200 text-lg leading-relaxed" style={{ fontFamily: 'Merriweather, serif' }}>
              {squadInsights.risk_assessment}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Irreplaceable Pillar */}
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
              <h3 className="text-red-400 font-bold text-lg mb-3 flex items-center">
                <FaBolt className="mr-2" />
                Irreplaceable Pillar
              </h3>
              <p className="text-2xl font-bold text-white mb-2">
                {squadInsights.irreplaceable_pillar.player_name}
              </p>
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-gray-400 text-sm">{squadInsights.irreplaceable_pillar.position}</span>
                <span className="text-yellow-400 font-bold" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                  CI: {(squadInsights.irreplaceable_pillar.criticality_index * 100).toFixed(0)}
                </span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed" style={{ fontFamily: 'Merriweather, serif' }}>
                {squadInsights.irreplaceable_pillar.tactical_dependency}
              </p>
            </div>

            {/* Fragility Point */}
            <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-6">
              <h3 className="text-orange-400 font-bold text-lg mb-3 flex items-center">
                <FaChartLine className="mr-2" />
                Fragility Point
              </h3>
              <p className="text-2xl font-bold text-white mb-2">
                {squadInsights.fragility_point.position}
              </p>
              <p className="text-gray-400 text-sm mb-3">Weakest Depth Position</p>
              <p className="text-gray-300 text-sm leading-relaxed" style={{ fontFamily: 'Merriweather, serif' }}>
                {squadInsights.fragility_point.reasoning}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Content Grid */}
      {!loading && !error && squadPlayers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tactical Positional Grid */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-[#00FF85]/20"
            >
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <GiSoccerBall className="mr-3 text-[#00FF85]" />
                Squad Structure ({squadPlayers.length} Players)
              </h2>

              {/* Position Sections */}
              <div className="space-y-6">
                {Object.entries(groupedPlayers).map(([position, players]) => (
                  <div key={position}>
                    <h3 className="text-lg font-semibold text-[#00FF85] mb-3 flex items-center">
                      {position}
                      <span className="ml-2 text-sm text-gray-400">({players.length})</span>
                    </h3>
                    
                    {players.length === 0 ? (
                      <div className="text-gray-500 italic text-sm py-2">No players in this position</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {players.map((player) => {
                          const isAbsent = absentPlayers.has(player.player_id);
                          const isSelected = selectedPlayer?.player_id === player.player_id;
                          const criticalityIndex = getCriticalityIndex(player.player_name);
                          const tacticalDependency = getTacticalDependency(player.player_name);
                          const primaryStat = getPrimaryStat(player);
                          
                          return (
                            <motion.div
                              key={player.player_id}
                              whileHover={{ scale: 1.02 }}
                              onClick={() => selectPlayer(player)}
                              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                isAbsent
                                  ? 'bg-red-900/20 border-red-500/50 opacity-50'
                                  : isSelected
                                  ? 'bg-[#00FF85]/10 border-[#00FF85]'
                                  : 'bg-gray-700/30 border-gray-600/50 hover:border-[#00FF85]/50'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  {/* Player Name */}
                                  <div className="flex items-center space-x-2 mb-2">
                                    <h4 className="text-white font-medium">{player.player_name}</h4>
                                    {player.isMock && (
                                      <span className="text-xs text-gray-500 italic">(Mock)</span>
                                    )}
                                    {player.isSystemicDependency && (
                                      <NeonTooltip content={`Contributes ${player.contributionPercentage.toFixed(0)}% of team G+A`}>
                                        <FaExclamationTriangle className="text-red-500 text-xs" />
                                      </NeonTooltip>
                                    )}
                                  </div>

                                  {/* Primary Stat Badge (Prominent) */}
                                  <div className="mb-3">
                                    <div className="inline-block bg-gradient-to-r from-[#00FF85]/20 to-[#00CC6A]/20 border border-[#00FF85]/30 rounded-lg px-3 py-2">
                                      <div className="text-2xl font-bold text-[#00FF85]" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                                        {primaryStat.value}
                                      </div>
                                      <div className="text-xs text-gray-400">{primaryStat.label}</div>
                                    </div>
                                  </div>

                                  {/* Secondary Stats */}
                                  <div className="text-xs text-gray-400 mb-2">
                                    {primaryStat.secondary}
                                  </div>
                                  
                                  <div className="flex items-center flex-wrap gap-2">
                                    {/* Risk Score Badge */}
                                    <div className={`inline-block px-2 py-1 rounded border text-xs font-bold ${getRiskColor(player.riskScore)}`}>
                                      <span style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                                        Risk: {player.riskScore?.toFixed(0) || 0}
                                      </span>
                                    </div>
                                    
                                    {/* High Performer Badge (>7.5 rating gets 20% boost) */}
                                    {player.isHighPerformer && (
                                      <NeonTooltip content="High performer - +20% reliance weight">
                                        <div className="inline-block px-2 py-1 rounded bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-bold">
                                          ⭐ +20%
                                        </div>
                                      </NeonTooltip>
                                    )}
                                    
                                    {/* RAG Criticality Index */}
                                    {criticalityIndex !== null && (
                                      <NeonTooltip content="AI-calculated criticality index">
                                        <div className="inline-block px-2 py-1 rounded bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-bold">
                                          <span style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                                            CI: {(criticalityIndex * 100).toFixed(0)}
                                          </span>
                                        </div>
                                      </NeonTooltip>
                                    )}
                                  </div>

                                  {/* Tactical Dependency (if available) */}
                                  {tacticalDependency && (
                                    <div className="mt-2 text-xs text-gray-400 italic leading-relaxed" style={{ fontFamily: 'Merriweather, serif' }}>
                                      "{tacticalDependency}"
                                    </div>
                                  )}
                                </div>
                                
                                {/* Absence Toggle */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAbsence(player.player_id);
                                  }}
                                  className={`p-2 rounded-lg transition-all ${
                                    isAbsent
                                      ? 'bg-red-500/20 text-red-500'
                                      : 'bg-gray-600/50 text-gray-400 hover:bg-[#00FF85]/20 hover:text-[#00FF85]'
                                  }`}
                                >
                                  {isAbsent ? <FaToggleOn className="text-xl" /> : <FaToggleOff className="text-xl" />}
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Impact Analysis Card */}
          <div className="lg:col-span-1">
            <AnimatePresence mode="wait">
              {selectedPlayer ? (
                <motion.div
                  key={selectedPlayer.player_id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-[#00FF85]/20 sticky top-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">What-If Analysis</h2>
                    <button
                      onClick={() => setSelectedPlayer(null)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Player Info */}
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-[#00FF85] mb-2">
                      {selectedPlayer.player_name}
                    </h3>
                    <p className="text-gray-400">{selectedPlayer.position}</p>
                  </div>

                  {/* Stat-Based Drop-Off Analysis */}
                  {(selectedPlayer.position === 'Forward' || selectedPlayer.position === 'Midfielder') && (() => {
                    const dropOff = calculateAttackerDropOff(selectedPlayer, squadPlayers);
                    return (
                      <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                        <h4 className="text-red-400 font-semibold mb-2 flex items-center">
                          <FaChartLine className="mr-2" />
                          Attacking Impact if Absent
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">Team xG/90 Drop:</span>
                            <span className="text-red-400 font-bold ml-2" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                              -{dropOff.xgDrop} (-{dropOff.percentage}%)
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Before:</span>
                            <span className="text-white ml-2" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                              {dropOff.teamXGBefore} xG/90
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">After:</span>
                            <span className="text-red-300 ml-2" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                              {dropOff.teamXGAfter} xG/90
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {(selectedPlayer.position === 'Defender' || selectedPlayer.position === 'Goalkeeper') && (() => {
                    const dropOff = calculateDefenderDropOff(selectedPlayer, squadPlayers);
                    return (
                      <div className="mb-6 bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                        <h4 className="text-orange-400 font-semibold mb-2 flex items-center">
                          <FaShieldAlt className="mr-2" />
                          Defensive Impact if Absent
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">Est. xGA Increase:</span>
                            <span className="text-orange-400 font-bold ml-2" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                              +{dropOff.xgaIncrease} (+{dropOff.percentage}%)
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Player Rating:</span>
                            <span className="text-white ml-2" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                              {dropOff.playerRating}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Avg Defensive Rating:</span>
                            <span className="text-gray-300 ml-2" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                              {dropOff.avgRating}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Role Criticality */}
                  <div className="mb-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <FaUsers className="text-[#00FF85]" />
                      <h4 className="text-white font-semibold">Role Criticality</h4>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {determineRoleCriticality(selectedPlayer, squadPlayers)}
                    </p>
                    {getCriticalityIndex(selectedPlayer.player_name) && (
                      <p className="text-sm text-purple-400 mt-1" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                        AI Index: {(getCriticalityIndex(selectedPlayer.player_name) * 100).toFixed(0)}/100
                      </p>
                    )}
                  </div>

                  {/* Financial Risk */}
                  <div className="mb-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <FaPoundSign className="text-[#00FF85]" />
                      <h4 className="text-white font-semibold">Replacement Cost</h4>
                    </div>
                    <p className="text-2xl font-bold text-yellow-500" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                      {formatCurrency(calculateReplacementCost(selectedPlayer.market_value))}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Market value × 1.4 premium
                    </p>
                  </div>

                  {/* Bench Depth */}
                  <div className="mb-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <FaChartLine className="text-[#00FF85]" />
                      <h4 className="text-white font-semibold">Bench Depth</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-2xl font-bold ${
                        assessBenchDepth(selectedPlayer.position, squadPlayers) === 'High'
                          ? 'text-green-500'
                          : assessBenchDepth(selectedPlayer.position, squadPlayers) === 'Medium'
                          ? 'text-yellow-500'
                          : 'text-red-500'
                      }`}>
                        {assessBenchDepth(selectedPlayer.position, squadPlayers)}
                      </span>
                      <NeonTooltip content={`${groupedPlayers[selectedPlayer.position]?.length || 0} players in ${selectedPlayer.position}`}>
                        <FaInfoCircle className="text-gray-400 cursor-help" />
                      </NeonTooltip>
                    </div>
                  </div>

                  {/* Real Stats from Database */}
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="text-white font-semibold mb-3">Live Stats from Database</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400">SofaScore</p>
                        <p className="text-white font-bold" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                          {selectedPlayer.sofascore_rating?.toFixed(1) || selectedPlayer.average_rating?.toFixed(1) || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Minutes</p>
                        <p className="text-white font-bold" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                          {selectedPlayer.minutes_played || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Goals</p>
                        <p className="text-white font-bold" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                          {selectedPlayer.total_goals || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Assists</p>
                        <p className="text-white font-bold" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                          {selectedPlayer.total_assists || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">G+A per 90</p>
                        <p className="text-white font-bold" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                          {selectedPlayer.contributions_per_90?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Market Value</p>
                        <p className="text-white font-bold" style={{ fontFamily: 'Chakra Petch, sans-serif' }}>
                          {formatCurrency(selectedPlayer.market_value)}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-[#00FF85]/20 sticky top-6 text-center"
                >
                  <FaInfoCircle className="text-gray-600 text-6xl mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">
                    Click on a player to see detailed what-if analysis
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !selectedTeam && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <FaShieldAlt className="text-gray-600 text-6xl mx-auto mb-4" />
          <p className="text-gray-400 text-xl">Please select a team to analyze squad risk</p>
          <p className="text-gray-500 text-sm mt-2">Real-time data will be fetched from Supabase</p>
        </motion.div>
      )}
    </div>
  );
};

export default SquadRisk;
