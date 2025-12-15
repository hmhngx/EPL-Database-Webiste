import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import { FaFutbol, FaVideo, FaTrophy, FaTimes, FaHandshake, FaSpinner, FaArrowLeft, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { highlightVideos } from '../data/highlightVideos';

const MatchDetail = () => {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightLink, setHighlightLink] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    stats: true,
    goals: true,
    highlights: true,
  });
  const [hoveredElement, setHoveredElement] = useState(null);

  useEffect(() => {
    const fetchMatchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const matchResponse = await fetch(`${apiBaseUrl}/api/matches/${id}`);

        if (!matchResponse.ok) {
          if (matchResponse.status === 404) {
            throw new Error('Match not found');
          }
          throw new Error(`HTTP error! Status: ${matchResponse.status}`);
        }
        
        const matchData = await matchResponse.json();
        
        if (matchData.success && matchData.data) {
          const transformedMatch = {
            fixture: {
              id: matchData.data.match_id,
              date: matchData.data.date,
              venue: {
                name: matchData.data.stadium_name || 'Unknown',
                city: matchData.data.stadium_city || 'Unknown',
              },
              referee: matchData.data.referee || 'Not available',
              status: {
                long: 'Finished',
              },
            },
            teams: {
              home: {
                id: matchData.data.home_club_id,
                name: matchData.data.home_club,
              },
              away: {
                id: matchData.data.away_club_id,
                name: matchData.data.away_club,
              },
            },
            goals: {
              home: matchData.data.home_goals,
              away: matchData.data.away_goals,
            },
          };
          
          setMatch(transformedMatch);

          if (highlightVideos[id]) {
            setHighlightLink(highlightVideos[id]);
          } else {
            const matchTitle = `${matchData.data.home_club} vs ${matchData.data.away_club}`;
            const searchQuery = `${matchTitle} 2023/2024 highlights`;
            const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
            setHighlightLink(youtubeSearchUrl);
          }
          
          setEvents([]);
        } else {
          throw new Error('Invalid API response structure');
        }
      } catch (error) {
        setError(error.message);
        console.error('Error fetching match details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchDetails();
  }, [id]);

  const goals = events.filter(event => event.type === 'Goal' && event.detail !== 'Missed Penalty');

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
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-primary mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading match details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
        <p className="font-semibold">Error:</p>
        <p>{error}</p>
        <Link to="/matches" className="text-primary hover:text-accent mt-4 inline-block">
          ← Back to Matches
        </Link>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
        <p className="font-semibold">Match not found</p>
        <Link to="/matches" className="text-primary hover:text-accent mt-4 inline-block">
          ← Back to Matches
        </Link>
      </div>
    );
  }

  const result = `${match.goals.home} - ${match.goals.away}`;
  const matchDate = new Date(match.fixture.date).toLocaleString();
  const venueName = match.fixture.venue.name;
  const venueCity = match.fixture.venue.city;
  const referee = match.fixture.referee || 'Not available';

  const homeGoals = match.goals.home;
  const awayGoals = match.goals.away;
  let resultType, resultIcon, resultClass, resultColor;
  
  if (homeGoals > awayGoals) {
    resultType = 'W';
    resultIcon = FaTrophy;
    resultClass = 'win';
    resultColor = 'text-green-600 dark:text-green-400';
  } else if (homeGoals < awayGoals) {
    resultType = 'L';
    resultIcon = FaTimes;
    resultClass = 'loss';
    resultColor = 'text-red-600 dark:text-red-400';
  } else {
    resultType = 'D';
    resultIcon = FaHandshake;
    resultClass = 'draw';
    resultColor = 'text-yellow-600 dark:text-yellow-400';
  }

  const ResultIcon = resultIcon;
  const isEmbedLink = highlightLink && highlightLink.includes('youtube.com/embed');

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Back Button */}
      <Link
        to="/matches"
        className="inline-flex items-center space-x-2 text-primary hover:text-accent transition-colors"
        aria-label="Back to matches"
      >
        <FaArrowLeft />
        <span>Back to Matches</span>
      </Link>

      {/* Main Match Card */}
      <motion.div
        variants={cardVariants}
        className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg hover:shadow-[0_0_30px_rgba(0,255,133,0.3)] transition-all duration-300 overflow-hidden"
      >
        <div className="p-8">
          {/* Match Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-heading font-bold text-gray-900 dark:text-white mb-6">
              {match.teams.home.name} vs {match.teams.away.name}
            </h1>
            
            {/* Result Display */}
            <motion.div
              className={`
                inline-flex items-center justify-center space-x-4 p-6 rounded-xl
                ${resultClass === 'win' ? 'bg-green-50 dark:bg-green-900/30' : ''}
                ${resultClass === 'loss' ? 'bg-red-50 dark:bg-red-900/30' : ''}
                ${resultClass === 'draw' ? 'bg-yellow-50 dark:bg-yellow-900/30' : ''}
                border-2 ${resultClass === 'win' ? 'border-green-500' : resultClass === 'loss' ? 'border-red-500' : 'border-yellow-500'}
              `}
              whileHover={{ scale: 1.05 }}
              animate={{
                boxShadow: hoveredElement === 'result' 
                  ? '0 0 20px rgba(0, 255, 133, 0.5)' 
                  : '0 0 0px rgba(0, 255, 133, 0)'
              }}
              onMouseEnter={() => setHoveredElement('result')}
              onMouseLeave={() => setHoveredElement(null)}
            >
              <motion.div
                animate={{
                  scale: hoveredElement === 'result' ? [1, 1.2, 1] : 1,
                }}
                transition={{ duration: 2, repeat: hoveredElement === 'result' ? Infinity : 0 }}
              >
                <ResultIcon className={`text-4xl ${resultColor}`} />
              </motion.div>
              <div>
                <div className="text-5xl font-heading font-bold text-gray-900 dark:text-white">
                  {result}
                </div>
                <div className={`text-sm font-semibold uppercase ${resultColor}`}>
                  {resultType === 'W' ? 'WIN' : resultType === 'L' ? 'LOSS' : 'DRAW'}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Match Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <motion.div
              className="p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg"
              whileHover={{ scale: 1.02, x: 4 }}
            >
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Date & Time</p>
              <p className="font-semibold text-gray-900 dark:text-white">{matchDate}</p>
            </motion.div>
            <motion.div
              className="p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg"
              whileHover={{ scale: 1.02, x: 4 }}
            >
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Venue</p>
              <p className="font-semibold text-gray-900 dark:text-white">{venueName}, {venueCity}</p>
            </motion.div>
            <motion.div
              className="p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg"
              whileHover={{ scale: 1.02, x: 4 }}
            >
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Referee</p>
              <p className="font-semibold text-gray-900 dark:text-white">{referee}</p>
            </motion.div>
            <motion.div
              className="p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg"
              whileHover={{ scale: 1.02, x: 4 }}
            >
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</p>
              <p className="font-semibold text-gray-900 dark:text-white">{match.fixture.status.long}</p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Goal Scorers Section */}
      {expandedSections.goals && (
        <motion.div
          variants={cardVariants}
          className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6"
        >
          <div
            className="flex items-center justify-between cursor-pointer mb-4"
            onClick={() => setExpandedSections({ ...expandedSections, goals: !expandedSections.goals })}
          >
            <h3 className="text-2xl font-heading font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FaFutbol className="text-primary" />
              Goal Scorers
            </h3>
            <motion.div
              animate={{ rotate: expandedSections.goals ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <FaChevronDown className="text-gray-400" />
            </motion.div>
          </div>
          <AnimatePresence>
            {expandedSections.goals && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {goals.length > 0 ? (
                  <ul className="space-y-2">
                    {goals.map((goal, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-3 bg-gray-50 dark:bg-neutral-700 rounded-lg"
                      >
                        {goal.player.name} ({goal.team.name}) - {goal.time.elapsed}'
                        {goal.time.extra && `+${goal.time.extra}'`}
                        {goal.detail === 'Own Goal' && ' (Own Goal)'}
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No goals scored in this match.</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Highlights Section */}
      {expandedSections.highlights && highlightLink && (
        <motion.div
          variants={cardVariants}
          className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6"
        >
          <div
            className="flex items-center justify-between cursor-pointer mb-4"
            onClick={() => setExpandedSections({ ...expandedSections, highlights: !expandedSections.highlights })}
          >
            <h3 className="text-2xl font-heading font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FaVideo className="text-primary" />
              Match Highlights
            </h3>
            <motion.div
              animate={{ rotate: expandedSections.highlights ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <FaChevronDown className="text-gray-400" />
            </motion.div>
          </div>
          <AnimatePresence>
            {expandedSections.highlights && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {isEmbedLink ? (
                  <div className="video-container rounded-lg overflow-hidden">
                    <iframe
                      width="100%"
                      height="315"
                      src={highlightLink}
                      title="Match Highlights"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="rounded-lg"
                    ></iframe>
                  </div>
                ) : (
                  <p className="text-center py-4">
                    <a
                      href={highlightLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-accent underline font-semibold"
                    >
                      Watch highlights on YouTube
                    </a>
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
};

export default MatchDetail;
