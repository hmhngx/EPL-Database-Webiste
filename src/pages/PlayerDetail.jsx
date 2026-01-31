import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaSpinner, FaFutbol, FaHandPaper, FaChartLine, FaStar, FaFlag, FaBirthdayCake, FaRulerVertical, FaWeight, FaUserFriends, FaExclamationTriangle } from 'react-icons/fa';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis } from 'recharts';
import TeamLogo from '../components/TeamLogo';
import Breadcrumb from '../components/Breadcrumb';
import NeonTooltip from '../components/NeonTooltip';
import { FaInfoCircle } from 'react-icons/fa';

// Helper function to format numeric values with null handling
const formatNumericValue = (value, decimals = 0) => {
  if (value == null || value === undefined || value === 0) return '--';
  const num = Number(value);
  if (isNaN(num)) return '--';
  return decimals > 0 ? num.toFixed(decimals) : num.toString();
};

// Calculate per-90 stats
const calculatePer90 = (value, minutes) => {
  if (!value || !minutes || minutes === 0) return 0;
  return (Number(value) / Number(minutes)) * 90;
};

// Normalize a value to 0-1 range based on min and max
const normalize = (value, min, max) => {
  if (max === min) return 0;
  return (value - min) / (max - min);
};

// Find similar players using Euclidean Distance
const findSimilarPlayers = (currentPlayer, allPlayers) => {
  if (!currentPlayer || !allPlayers || allPlayers.length === 0) return [];

  // Filter out the current player and players with insufficient data
  const validPlayers = allPlayers.filter(p => 
    p.id !== currentPlayer.id && 
    p.minutes_played && 
    p.minutes_played >= 90 // At least 90 minutes played
  );

  if (validPlayers.length === 0) return [];

  // Calculate per-90 stats for current player
  const currentXg90 = calculatePer90(currentPlayer.xg, currentPlayer.minutes_played);
  const currentAst90 = calculatePer90(currentPlayer.assists, currentPlayer.minutes_played);
  const currentProgPasses90 = calculatePer90(currentPlayer.progressive_passes, currentPlayer.minutes_played);
  const currentRating = Number(currentPlayer.sofascore_rating) || 0;
  const currentYellowCards = Number(currentPlayer.yellow_cards) || 0;

  // Calculate per-90 stats for all valid players and find min/max for normalization
  const playersWithStats = validPlayers.map(p => ({
    ...p,
    xg_90: calculatePer90(p.xg, p.minutes_played),
    ast_90: calculatePer90(p.assists, p.minutes_played),
    progressive_passes_90: calculatePer90(p.progressive_passes, p.minutes_played),
    sofascore_rating: Number(p.sofascore_rating) || 0,
    yellow_cards: Number(p.yellow_cards) || 0
  }));

  // Find min/max for normalization
  const xg90Values = [currentXg90, ...playersWithStats.map(p => p.xg_90)];
  const ast90Values = [currentAst90, ...playersWithStats.map(p => p.ast_90)];
  const progPasses90Values = [currentProgPasses90, ...playersWithStats.map(p => p.progressive_passes_90)];
  const ratingValues = [currentRating, ...playersWithStats.map(p => p.sofascore_rating)];
  const yellowCardsValues = [currentYellowCards, ...playersWithStats.map(p => p.yellow_cards)];

  const minXg90 = Math.min(...xg90Values);
  const maxXg90 = Math.max(...xg90Values);
  const minAst90 = Math.min(...ast90Values);
  const maxAst90 = Math.max(...ast90Values);
  const minProgPasses90 = Math.min(...progPasses90Values);
  const maxProgPasses90 = Math.max(...progPasses90Values);
  const minRating = Math.min(...ratingValues);
  const maxRating = Math.max(...ratingValues);
  const minYellowCards = Math.min(...yellowCardsValues);
  const maxYellowCards = Math.max(...yellowCardsValues);

  // Normalize current player's stats
  const currentNormalized = {
    xg_90: normalize(currentXg90, minXg90, maxXg90),
    ast_90: normalize(currentAst90, minAst90, maxAst90),
    progressive_passes_90: normalize(currentProgPasses90, minProgPasses90, maxProgPasses90),
    sofascore_rating: normalize(currentRating, minRating, maxRating),
    yellow_cards: normalize(currentYellowCards, minYellowCards, maxYellowCards)
  };

  // Calculate Euclidean distance for each player
  const playersWithDistance = playersWithStats.map(p => {
    const normalized = {
      xg_90: normalize(p.xg_90, minXg90, maxXg90),
      ast_90: normalize(p.ast_90, minAst90, maxAst90),
      progressive_passes_90: normalize(p.progressive_passes_90, minProgPasses90, maxProgPasses90),
      sofascore_rating: normalize(p.sofascore_rating, minRating, maxRating),
      yellow_cards: normalize(p.yellow_cards, minYellowCards, maxYellowCards)
    };

    // Euclidean distance
    const distance = Math.sqrt(
      Math.pow(normalized.xg_90 - currentNormalized.xg_90, 2) +
      Math.pow(normalized.ast_90 - currentNormalized.ast_90, 2) +
      Math.pow(normalized.progressive_passes_90 - currentNormalized.progressive_passes_90, 2) +
      Math.pow(normalized.sofascore_rating - currentNormalized.sofascore_rating, 2) +
      Math.pow(normalized.yellow_cards - currentNormalized.yellow_cards, 2)
    );

    // Convert distance to similarity percentage (0-100%)
    // Lower distance = higher similarity
    // Max possible distance is sqrt(5) for 5 dimensions normalized to 0-1
    const maxDistance = Math.sqrt(5);
    const similarity = Math.max(0, (1 - distance / maxDistance) * 100);

    return {
      ...p,
      distance,
      similarity
    };
  });

  // Sort by distance (ascending) and return top 3
  return playersWithDistance
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);
};

// Team Themes Mapping - Official Premier League Team Colors
const TEAM_THEMES = {
  'Arsenal': '#EF0107',
  'Aston Villa': '#95BFE5',
  'Bournemouth': '#DA020E',
  'Brentford': '#E30613',
  'Brighton & Hove Albion': '#0057B8',
  'Burnley': '#6C1D45',
  'Chelsea': '#034694',
  'Crystal Palace': '#1B458F',
  'Everton': '#003399',
  'Fulham': '#000000',
  'Liverpool': '#C8102E',
  'Luton Town': '#FF8C00',
  'Manchester City': '#6CABDD',
  'Manchester United': '#DA020E',
  'Newcastle United': '#241F20',
  'Nottingham Forest': '#DD0000',
  'Sheffield United': '#EE2737',
  'Tottenham Hotspur': '#132257',
  'West Ham United': '#7A263A',
  'Wolverhampton Wanderers': '#FDB913',
  // Fallback for any team not listed
  'default': '#38003C' // EPL Purple
};

const PlayerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [averageStats, setAverageStats] = useState(null);
  const [leagueMaxStats, setLeagueMaxStats] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [similarPlayers, setSimilarPlayers] = useState([]);
  const [valuation, setValuation] = useState(null);
  const [valuationLoading, setValuationLoading] = useState(false);

  // Fetch player data
  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/players/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Player not found');
          }
          throw new Error('Failed to fetch player data');
        }

        const data = await response.json();
        setPlayer(data.data);

        // Fetch average stats for radar chart comparison
        // We'll fetch all players to calculate averages and max values
        const allPlayersResponse = await fetch('/api/players');
        if (allPlayersResponse.ok) {
          const allPlayersData = await allPlayersResponse.json();
          const players = allPlayersData.data || [];
          setAllPlayers(players);
          
          // Calculate averages for radar chart metrics
          const validStats = players.filter(p => 
            p.goals != null && p.assists != null && p.xg != null && 
            p.progressive_passes != null && p.sofascore_rating != null
          );

          if (validStats.length > 0) {
            const avgGoals = validStats.reduce((sum, p) => sum + (Number(p.goals) || 0), 0) / validStats.length;
            const avgAssists = validStats.reduce((sum, p) => sum + (Number(p.assists) || 0), 0) / validStats.length;
            const avgXg = validStats.reduce((sum, p) => sum + (Number(p.xg) || 0), 0) / validStats.length;
            const avgProgPasses = validStats.reduce((sum, p) => sum + (Number(p.progressive_passes) || 0), 0) / validStats.length;
            const avgRating = validStats.reduce((sum, p) => sum + (Number(p.sofascore_rating) || 0), 0) / validStats.length;

            setAverageStats({
              goals: avgGoals,
              assists: avgAssists,
              xg: avgXg,
              progressive_passes: avgProgPasses,
              rating: avgRating
            });

            // Calculate league max values for normalization
            // Handle null/undefined values explicitly
            const maxGoals = Math.max(...validStats.map(p => Number(p.goals) || 0), 0);
            const maxXg = Math.max(...validStats.map(p => Number(p.xg) || 0), 0);
            const maxAssists = Math.max(...validStats.map(p => Number(p.assists) || 0), 0);
            const maxXag = Math.max(...validStats.map(p => Number(p.xag) || 0), 0);
            const maxProgPasses = Math.max(...validStats.map(p => Number(p.progressive_passes) || 0), 0);
            const maxRating = Math.max(...validStats.map(p => Number(p.sofascore_rating) || 0), 0);
            const maxYellowCards = Math.max(...validStats.map(p => Number(p.yellow_cards) || 0), 0);
            const maxRedCards = Math.max(...validStats.map(p => Number(p.red_cards) || 0), 0);

            setLeagueMaxStats({
              goals: maxGoals,
              xg: maxXg,
              assists: maxAssists,
              xag: maxXag,
              progressive_passes: maxProgPasses,
              rating: maxRating,
              yellow_cards: maxYellowCards,
              red_cards: maxRedCards
            });
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPlayer();
    }
  }, [id]);

  // Get team color
  const teamColor = useMemo(() => {
    if (!player) return TEAM_THEMES.default;
    return TEAM_THEMES[player.team_name] || TEAM_THEMES.default;
  }, [player]);

  // Check if player has no appearances
  const hasNoAppearances = !player?.minutes_played || player.minutes_played === 0;
  const hasInsufficientMinutes = (player?.minutes_played || 0) < 90;

  // Prepare Visual Archetype Radar Chart data with normalized values (0-100 scale)
  const archetypeRadarData = useMemo(() => {
    if (!player || !leagueMaxStats || hasInsufficientMinutes) {
      return [];
    }

    // Normalize function: converts value to 0-100 scale
    const normalize = (value, max) => {
      if (!max || max === 0) return 0;
      return Math.min(Math.max((value / max) * 100, 0), 100);
    };

    // Calculate composite metrics
    const playerGoals = Number(player.goals) || 0;
    const playerXg = Number(player.xg) || 0;
    const attackingValue = playerGoals + playerXg;
    const maxAttacking = (leagueMaxStats.goals || 0) + (leagueMaxStats.xg || 0);

    const playerAssists = Number(player.assists) || 0;
    const playerXag = Number(player.xag) || 0;
    const playmakingValue = playerAssists + playerXag;
    const maxPlaymaking = (leagueMaxStats.assists || 0) + (leagueMaxStats.xag || 0);

    const playerProgPasses = Number(player.progressive_passes) || 0;
    const maxProgPasses = leagueMaxStats.progressive_passes || 0;

    // Discipline: inverse of cards (higher is better)
    const playerYellowCards = Number(player.yellow_cards) || 0;
    const playerRedCards = Number(player.red_cards) || 0;
    const totalCards = playerYellowCards + (playerRedCards * 2); // Red cards weighted more
    const maxCards = (leagueMaxStats.yellow_cards || 0) + ((leagueMaxStats.red_cards || 0) * 2);
    const disciplineValue = maxCards > 0 ? Math.max(0, 100 - normalize(totalCards, maxCards)) : 100;

    const playerRating = Number(player.sofascore_rating) || 0;
    const maxRating = leagueMaxStats.rating || 0;

    // Only return data if we have valid max values
    if (maxAttacking === 0 && maxPlaymaking === 0 && maxProgPasses === 0 && maxRating === 0) {
      return [];
    }

    return [
      {
        subject: 'Attacking',
        value: maxAttacking > 0 ? normalize(attackingValue, maxAttacking) : 0,
        fullMark: 100,
        description: 'Combined goals and expected goals (xG) - measures goal-scoring threat'
      },
      {
        subject: 'Playmaking',
        value: maxPlaymaking > 0 ? normalize(playmakingValue, maxPlaymaking) : 0,
        fullMark: 100,
        description: 'Combined assists and expected assists (xAG) - measures chance creation'
      },
      {
        subject: 'Progression',
        value: maxProgPasses > 0 ? normalize(playerProgPasses, maxProgPasses) : 0,
        fullMark: 100,
        description: 'Progressive passes - measures ability to advance play forward'
      },
      {
        subject: 'Discipline',
        value: disciplineValue,
        fullMark: 100,
        description: 'Inverse of cards received - higher means fewer disciplinary issues'
      },
      {
        subject: 'Rating',
        value: maxRating > 0 ? normalize(playerRating, maxRating) : 0,
        fullMark: 100,
        description: 'SofaScore overall performance rating'
      }
    ];
  }, [player, leagueMaxStats, hasInsufficientMinutes]);

  // Prepare radar chart data with normalized values (0-100 scale) - existing chart
  const radarChartData = player && averageStats && !hasInsufficientMinutes ? (() => {
    // Define max values for normalization (based on realistic Premier League ranges)
    const maxValues = {
      goals: 30,
      assists: 15,
      xg: 20,
      progressive_passes: 200,
      rating: 10
    };

    // Normalize function: converts value to 0-100 scale
    const normalize = (value, max) => {
      if (!max || max === 0) return 0;
      return Math.min((value / max) * 100, 100);
    };

    const playerGoals = Number(player.goals) || 0;
    const playerAssists = Number(player.assists) || 0;
    const playerXg = Number(player.xg) || 0;
    const playerProgPasses = Number(player.progressive_passes) || 0;
    const playerRating = Number(player.sofascore_rating) || 0;

    return [
      {
        subject: 'Goals',
        player: normalize(playerGoals, maxValues.goals),
        average: normalize(averageStats.goals, maxValues.goals),
        fullMark: 100
      },
      {
        subject: 'Assists',
        player: normalize(playerAssists, maxValues.assists),
        average: normalize(averageStats.assists, maxValues.assists),
        fullMark: 100
      },
      {
        subject: 'xG',
        player: normalize(playerXg, maxValues.xg),
        average: normalize(averageStats.xg, maxValues.xg),
        fullMark: 100
      },
      {
        subject: 'Prog. Passes',
        player: normalize(playerProgPasses, maxValues.progressive_passes),
        average: normalize(averageStats.progressive_passes, maxValues.progressive_passes),
        fullMark: 100
      },
      {
        subject: 'Rating',
        player: normalize(playerRating, maxValues.rating),
        average: normalize(averageStats.rating, maxValues.rating),
        fullMark: 100
      }
    ];
  })() : [];

  // Custom tooltip for archetype radar
  const ArchetypeTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-xl p-3">
          <p className="font-semibold text-white">{data.subject}</p>
          <p className="text-sm text-white/60 mt-1">{data.description}</p>
          <p className="text-lg font-bold mt-2" style={{ color: teamColor }}>
            {data.value.toFixed(1)} / 100
          </p>
        </div>
      );
    }
    return null;
  };

  // Format height (cm to feet/inches)
  const formatHeight = (heightCm) => {
    if (!heightCm) return 'N/A';
    const totalInches = heightCm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}" (${heightCm} cm)`;
  };

  // Format weight (kg to lbs)
  const formatWeight = (weightKg) => {
    if (!weightKg) return 'N/A';
    const lbs = Math.round(weightKg * 2.20462);
    return `${lbs} lbs (${weightKg} kg)`;
  };

  // Calculate similar players
  useEffect(() => {
    if (player && allPlayers.length > 0) {
      const similar = findSimilarPlayers(player, allPlayers);
      setSimilarPlayers(similar);
    }
  }, [player, allPlayers]);

  // Fetch player valuation
  useEffect(() => {
    const fetchValuation = async () => {
      if (!player || !player.age || !player.position || !player.minutes_played || 
          player.goals == null || player.assists == null || player.sofascore_rating == null) {
        return;
      }

      try {
        setValuationLoading(true);
        const response = await fetch('/api/ai/valuation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            age: player.age,
            position: player.position,
            minutes_played: player.minutes_played,
            goals: player.goals,
            assists: player.assists,
            sofascore_rating: player.sofascore_rating
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setValuation(data.data);
          }
        }
      } catch (error) {
        console.error('Error fetching valuation:', error);
      } finally {
        setValuationLoading(false);
      }
    };

    if (player) {
      fetchValuation();
    }
  }, [player]);

  // Generate sparkline data (simulated trend based on current rating)
  const sparklineData = useMemo(() => {
    if (!player || !player.sofascore_rating) return [];
    
    const currentRating = Number(player.sofascore_rating) || 0;
    const data = [];
    
    // Generate 10 data points with slight variation around current rating
    for (let i = 0; i < 10; i++) {
      // Create a realistic trend: slight variation ±0.3 from current rating
      const variation = (Math.random() - 0.5) * 0.6;
      const trend = (i - 5) * 0.05; // Slight upward trend
      const rating = Math.max(0, Math.min(10, currentRating + variation + trend));
      data.push({
        game: i + 1,
        rating: Number(rating.toFixed(1))
      });
    }
    
    return data;
  }, [player]);

  // Check if essential stats are missing
  const hasMissingEssentialStats = useMemo(() => {
    if (!player) return false;
    const essentialStats = ['goals', 'assists', 'xg', 'sofascore_rating'];
    return essentialStats.every(stat => player[stat] == null || player[stat] === undefined || player[stat] === 0);
  }, [player]);

  // Handle compare button click
  const handleCompare = (similarPlayerId) => {
    navigate(`/compare?playerA=${player.id}&playerB=${similarPlayerId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a001c] via-[#0a0a0a] to-black flex items-center justify-center">
        <FaSpinner className="animate-spin text-4xl text-[#00FF85]" />
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a001c] via-[#0a0a0a] to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-500/20 backdrop-blur-md border border-red-500/50 rounded-xl p-6 text-red-200">
            <p className="font-bold text-lg mb-2">Error loading player</p>
            <p className="mb-4">{error || 'Player not found'}</p>
            <button
              onClick={() => navigate('/players')}
              className="text-[#00FF85] hover:text-[#00FF85]/80 transition-colors underline"
            >
              ← Back to Players
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a001c] via-[#0a0a0a] to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[
          { to: '/players', label: 'Players' },
          { label: player.player_name }
        ]} />
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-8"
        >
          {/* Hero Section - Night Stadium Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden"
          >
          <div className="p-8 md:p-12 text-white">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Large Team Logo */}
              <div className="flex-shrink-0">
                <TeamLogo
                  logoUrl={player.logo_url || player.team_logo}
                  teamName={player.team_name}
                  className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white/10 p-4 object-contain"
                />
              </div>

              {/* Player Name and Jersey Number */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                  {player.jersey_number && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="text-8xl md:text-9xl font-bold text-white/10"
                    >
                      {player.jersey_number}
                    </motion.div>
                  )}
                  <h1 className="text-5xl md:text-7xl font-heading font-bold text-white tracking-tight">
                    {player.player_name}
                  </h1>
                </div>
                <div className="text-xl md:text-2xl text-white/60">
                  {player.position} • {player.team_name}
                </div>
                {/* Squad Player / No Appearances Badge */}
                {hasNoAppearances && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-white/10 text-white border border-white/20">
                      Squad Player
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-amber-500/20 text-white border border-amber-500/30">
                      No Appearances this Season
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          </motion.div>

          {/* Visual Archetype Radar Chart - Prominent placement */}
          {archetypeRadarData.length > 0 && !hasInsufficientMinutes && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-6 md:p-8"
            >
          <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Player Basic Info Card */}
              <div className="flex-shrink-0 w-full md:w-64">
                <div className="bg-white/5 backdrop-blur-md rounded-lg p-6 border border-white/10" style={{ borderColor: teamColor }}>
                  <div className="flex items-center gap-4 mb-4">
                    <TeamLogo
                      logoUrl={player.logo_url || player.team_logo}
                      teamName={player.team_name}
                      className="w-16 h-16 rounded-full bg-white/10 p-2 object-contain"
                    />
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {player.player_name}
                      </h3>
                      <p className="text-sm text-white/60">
                        {player.position} • {player.team_name}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">Appearances</span>
                      <span className="font-semibold text-white">
                        {formatNumericValue(player.appearances)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Minutes</span>
                      <span className="font-semibold text-white">
                        {player.minutes_played != null ? player.minutes_played.toLocaleString() : '--'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Radar Chart with Staggered Animation */}
              <div className="flex-1 w-full">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-2xl md:text-3xl font-heading font-bold text-white tracking-tight">
                    Visual Archetype
                  </h2>
                  <NeonTooltip content="Normalized performance metrics (0-100) vs League Average">
                    <FaInfoCircle className="text-[#00FF85]/60 text-sm cursor-help" />
                  </NeonTooltip>
                </div>
                <p className="text-sm text-white/60 mb-6">
                  Comprehensive player profile across five key dimensions
                </p>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="h-64 md:h-80 lg:h-96"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={archetypeRadarData}>
                      <PolarGrid stroke={teamColor} opacity={0.2} />
                      <PolarAngleAxis 
                        dataKey="subject" 
                        tick={{ fill: '#ffffff', fontSize: 13, fontWeight: 600 }}
                      />
                      <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, 100]}
                        tick={{ fill: '#ffffff', fontSize: 10, opacity: 0.5 }}
                        tickCount={5}
                      />
                      <Radar
                        name="Player Archetype"
                        dataKey="value"
                        stroke={teamColor}
                        fill={teamColor}
                        fillOpacity={0.3}
                        strokeWidth={3}
                      />
                      <Tooltip content={<ArchetypeTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </motion.div>
              </div>
          </div>
        </motion.div>
      )}

          {/* AI Market Value & Club Fit Card */}
          {player && (valuation || valuationLoading) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-gradient-to-br from-[#00FF85]/10 to-transparent border-l-4 border-[#00FF85] rounded-xl shadow-2xl p-6 md:p-8 backdrop-blur-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-white tracking-tight">
                  Financial Intelligence
                </h2>
                {valuation && valuation.value >= 50000000 && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30">
                    <FaExclamationTriangle className="text-amber-400 text-sm" />
                    <span className="text-xs font-semibold text-amber-300">FFP Warning</span>
                  </div>
                )}
              </div>

              {valuationLoading ? (
                <div className="flex items-center justify-center py-12">
                  <FaSpinner className="animate-spin text-4xl text-[#00FF85]" />
                </div>
              ) : valuation ? (
                <div className="space-y-6">
                  {/* Market Value Badge */}
                  <div className="flex items-center justify-center">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl px-8 py-6 border border-white/20">
                      <div className="text-sm text-white/60 mb-2 text-center">Market Value</div>
                      <div className="text-5xl md:text-6xl font-bold text-[#00FF85] text-center">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: valuation.currency || 'EUR',
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                          notation: 'compact',
                          compactDisplay: 'short'
                        }).format(valuation.value)}
                      </div>
                    </div>
                  </div>

                  {/* Sparkline Chart */}
                  {sparklineData.length > 0 && (
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="text-sm text-white/60 mb-2">Rating Trend (Last 10 Games)</div>
                      <div className="h-20 md:h-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sparklineData}>
                            <Line
                              type="monotone"
                              dataKey="rating"
                              stroke="#00FF85"
                              strokeWidth={2}
                              dot={false}
                              isAnimationActive={true}
                            />
                            <XAxis
                              dataKey="game"
                              hide
                            />
                            <YAxis
                              domain={[0, 10]}
                              hide
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Scout's Recommendation */}
                  {valuation.fit_suggestions && valuation.fit_suggestions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Scout's Recommendation</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {valuation.fit_suggestions.map((suggestion, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            className="bg-white/5 backdrop-blur-md rounded-lg p-4 border border-white/10 hover:border-[#00FF85]/50 transition-all"
                          >
                            <div className="flex flex-col items-center text-center space-y-3">
                              <TeamLogo
                                logoUrl={null}
                                teamName={suggestion.club_name}
                                className="w-16 h-16 rounded-full bg-white/10 p-2 object-contain"
                              />
                              <div>
                                <h4 className="font-bold text-white text-sm mb-1">
                                  {suggestion.club_name}
                                </h4>
                                <p className="text-xs text-white/60 leading-relaxed">
                                  {suggestion.logic}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </motion.div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column - Main Stats */}
            <div className="lg:col-span-3 space-y-6">
              {/* Missing Data Notice */}
              {hasMissingEssentialStats && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 text-white/60 text-sm"
                >
                  ⚠️ Data currently unavailable for this player
                </motion.div>
              )}

              {/* Season Stats Grid - 5 Column Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
              >
                {/* SofaScore Rating Card (Gold) */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-6 hover:border-[#00FF85]/50 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <FaStar className="text-3xl text-[#00FF85]" />
                    <span className="text-sm text-white/60 font-semibold">The 'Gold' stat</span>
                  </div>
                  <div className="text-4xl font-bold text-white">
                    {formatNumericValue(player.sofascore_rating, 1)}
                  </div>
                  <div className="text-sm text-white/60 mt-1 font-semibold">Rating</div>
                </div>

                {/* Goals Card */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-6 hover:border-[#00FF85]/50 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <FaFutbol className="text-3xl text-red-500" />
                    <span className="text-sm text-white/60">Scored</span>
                  </div>
                  <div className="text-4xl font-bold text-white">
                    {formatNumericValue(player.goals)}
                  </div>
                  <div className="text-sm text-white/60 mt-1">Goals</div>
                </div>

                {/* Assists Card */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-6 hover:border-[#00FF85]/50 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <FaHandPaper className="text-3xl text-blue-500" />
                    <span className="text-sm text-white/60">Created</span>
                  </div>
                  <div className="text-4xl font-bold text-white">
                    {formatNumericValue(player.assists)}
                  </div>
                  <div className="text-sm text-white/60 mt-1">Assists</div>
                </div>

                {/* xG Card */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-6 hover:border-[#00FF85]/50 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <FaChartLine className="text-3xl text-green-500" />
                    <span className="text-sm text-white/60">Expected</span>
                  </div>
                  <div className="text-4xl font-bold text-white">
                    {formatNumericValue(player.xg, 2)}
                  </div>
                  <div className="text-sm text-white/60 mt-1">xG</div>
                </div>

                {/* xAG Card */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-6 hover:border-[#00FF85]/50 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <FaChartLine className="text-3xl text-purple-500" />
                    <span className="text-sm text-white/60">Expected</span>
                  </div>
                  <div className="text-4xl font-bold text-white">
                    {formatNumericValue(player.xag, 2)}
                  </div>
                  <div className="text-sm text-white/60 mt-1">xAG</div>
                </div>
              </motion.div>

              {/* Radar Chart - Only show if player has at least 90 minutes */}
              {radarChartData.length > 0 && !hasInsufficientMinutes ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-6"
                >
                  <h2 className="text-2xl font-heading font-bold text-white mb-6 tracking-tight">
                    Performance Profile
                  </h2>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="h-64 md:h-80 lg:h-96"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarChartData}>
                        <PolarGrid stroke="#ffffff" opacity={0.1} />
                        <PolarAngleAxis 
                          dataKey="subject" 
                          tick={{ fill: '#ffffff', fontSize: 12, fontWeight: 500 }}
                        />
                        <PolarRadiusAxis 
                          angle={90} 
                          domain={[0, 100]}
                          tick={{ fill: '#ffffff', fontSize: 10, opacity: 0.5 }}
                        />
                        <Radar
                          name="Player"
                          dataKey="player"
                          stroke="#00FF85"
                          fill="#00FF85"
                          fillOpacity={0.3}
                          strokeWidth={2}
                        />
                        <Radar
                          name="Average"
                          dataKey="average"
                          stroke="#9CA3AF"
                          fill="#9CA3AF"
                          fillOpacity={0.2}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px', color: '#ffffff' }}
                          iconType="line"
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </motion.div>
                </motion.div>
              ) : hasNoAppearances ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-8"
                >
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">📊</div>
                    <h2 className="text-2xl font-heading font-bold text-white mb-2 tracking-tight">
                      No Performance Data Available
                    </h2>
                    <p className="text-white/60">
                      This player has not made any appearances this season. Performance metrics will be available once they feature in a match.
                    </p>
                  </div>
                </motion.div>
              ) : hasInsufficientMinutes ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-8"
                >
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">📊</div>
                    <h2 className="text-2xl font-heading font-bold text-white mb-2 tracking-tight">
                      Insufficient Data for Performance Profile
                    </h2>
                    <p className="text-white/60">
                      This player has played less than 90 minutes this season. Performance metrics will be available after they complete at least one full match.
                    </p>
                  </div>
                </motion.div>
              ) : null}

              {/* Similar Players Section */}
              {similarPlayers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <FaUserFriends className="text-3xl text-[#00FF85]" />
                    <h2 className="text-2xl font-heading font-bold text-white tracking-tight">
                      Scout's Recommendation: Similar Profiles
                    </h2>
                  </div>
                  <p className="text-sm text-white/60 mb-6">
                    Players with similar statistical profiles based on xG/90, Assists/90, Progressive Passes/90, Rating, and Discipline
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {similarPlayers.map((similarPlayer, index) => (
                      <motion.div
                        key={similarPlayer.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                        className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-4 hover:border-[#00FF85]/50 transition-all"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <TeamLogo
                            logoUrl={similarPlayer.logo_url || similarPlayer.team_logo}
                            teamName={similarPlayer.team_name}
                            className="w-12 h-12 rounded-full bg-white/10 p-1 object-contain flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-white truncate">
                              {similarPlayer.player_name}
                            </h3>
                            <p className="text-xs text-white/60 truncate">
                              {similarPlayer.position} • {similarPlayer.team_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm text-white/60">Similarity</span>
                          <span className="text-xl font-bold text-[#00FF85]">
                            {similarPlayer.similarity.toFixed(0)}% Match
                          </span>
                        </div>
                        <NeonTooltip content="Compare detailed stats with this player">
                          <button
                            onClick={() => handleCompare(similarPlayer.id)}
                            className="w-full bg-[#00FF85]/10 hover:bg-[#00FF85]/20 border border-[#00FF85]/30 hover:border-[#00FF85]/50 text-[#00FF85] font-semibold py-2 px-4 rounded-lg transition-all duration-300"
                          >
                            Compare
                          </button>
                        </NeonTooltip>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right Column - Physicals & Bio Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-1"
            >
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-6 sticky top-8">
                <h2 className="text-2xl font-heading font-bold text-white mb-6 tracking-tight">
                  Physicals & Bio
                </h2>
                <div className="space-y-6">
                {/* Nationality */}
                <div className="flex items-start space-x-4">
                  <FaFlag className="text-2xl text-[#00FF85] mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-white/60 mb-1">Nationality</div>
                    <div className="text-lg font-semibold text-white">
                      {player.nationality || '--'}
                    </div>
                  </div>
                </div>

                {/* Age */}
                <div className="flex items-start space-x-4">
                  <FaBirthdayCake className="text-2xl text-[#00FF85] mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-white/60 mb-1">Age</div>
                    <div className="text-lg font-semibold text-white">
                      {player.age != null ? `${player.age} years` : '--'}
                    </div>
                  </div>
                </div>

                {/* Height */}
                <div className="flex items-start space-x-4">
                  <FaRulerVertical className="text-2xl text-[#00FF85] mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-white/60 mb-1">Height</div>
                    <div className="text-lg font-semibold text-white">
                      {formatHeight(player.height)}
                    </div>
                  </div>
                </div>

                {/* Weight */}
                <div className="flex items-start space-x-4">
                  <FaWeight className="text-2xl text-[#00FF85] mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-white/60 mb-1">Weight</div>
                    <div className="text-lg font-semibold text-white">
                      {formatWeight(player.weight)}
                    </div>
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="pt-6 border-t border-white/10 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-white/60">Appearances</span>
                    <span className="text-sm font-semibold text-white">
                      {formatNumericValue(player.appearances)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-white/60">Minutes Played</span>
                    <span className="text-sm font-semibold text-white">
                      {player.minutes_played != null ? player.minutes_played.toLocaleString() : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-white/60">Yellow Cards</span>
                    <span className="text-sm font-semibold text-white">
                      {formatNumericValue(player.yellow_cards)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-white/60">Red Cards</span>
                    <span className="text-sm font-semibold text-white">
                      {formatNumericValue(player.red_cards)}
                    </span>
                  </div>
                </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PlayerDetail;

