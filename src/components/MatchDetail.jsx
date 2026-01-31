import { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import { FaFutbol, FaVideo, FaSpinner, FaArrowLeft, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import MatchTimeline from './MatchTimeline';
import MatchStatsDashboard from './MatchStatsDashboard';
import H2HComparison from './H2HComparison';
import MomentumChart from './MomentumChart';
import ShotMap from './ShotMap';

const MatchDetail = () => {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [matchStats, setMatchStats] = useState(null);
  const [h2hData, setH2hData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightLink, setHighlightLink] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    stats: true,
    goals: true,
    highlights: true,
  });
  const [hoveredElement, setHoveredElement] = useState(null);

  // Function to fetch AI match summary
  const fetchAIMatchSummary = async (matchData, eventsData, statsData, apiBaseUrl, isMountedRef) => {
    try {
      if (!isMountedRef.current) return;
      setAiSummaryLoading(true);
      setAiSummaryError(null);

      const response = await fetch(`${apiBaseUrl}/api/ai/match-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          match: matchData,
          events: eventsData,
          stats: statsData,
        }),
      });

      if (!isMountedRef.current) return;

      if (!response.ok) {
        throw new Error(`Failed to fetch AI summary: ${response.status}`);
      }

      const result = await response.json();
      if (!isMountedRef.current) return;

      if (result.success && result.data?.summary) {
        setAiSummary(result.data.summary);
      } else {
        throw new Error('Invalid AI summary response');
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error('Error fetching AI match summary:', error);
        setAiSummaryError(error.message);
        // Don't fail the whole page if AI summary fails
      }
    } finally {
      if (isMountedRef.current) {
        setAiSummaryLoading(false);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

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
              matchweek: matchData.data.matchweek || null,
              venue: {
                name: matchData.data.stadium_name || 'Unknown',
              },
              status: {
                long: 'Finished',
              },
            },
            teams: {
              home: {
                id: matchData.data.home_team_id,
                name: matchData.data.home_team,
                logoUrl: matchData.data.home_logo_url,
              },
              away: {
                id: matchData.data.away_team_id,
                name: matchData.data.away_team,
                logoUrl: matchData.data.away_logo_url,
              },
            },
            goals: {
              home: matchData.data.home_team_score,
              away: matchData.data.away_team_score,
            },
          };
          
          setMatch(transformedMatch);
          
          // Extract match events from API response
          const events = matchData.data.match_events || [];
          setEvents(events);

          // Extract match stats from API response
          const stats = matchData.data.match_stats || null;
          setMatchStats(stats);

          // Fetch H2H comparison data
          try {
            const h2hUrl = `${apiBaseUrl}/api/matches/${id}/h2h`;
            const h2hResponse = await fetch(h2hUrl);
            
            if (h2hResponse.ok) {
              const h2hResult = await h2hResponse.json();
              
              if (h2hResult.success && h2hResult.data) {
                setH2hData(h2hResult.data);
              }
            }
          } catch (h2hError) {
            // Don't fail the whole page if H2H data fails
          }

          // Generate YouTube search URL for highlights
          const matchTitle = `${matchData.data.home_team} vs ${matchData.data.away_team}`;
          const searchQuery = `${matchTitle} 2023/2024 highlights`;
          const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
          setHighlightLink(youtubeSearchUrl);

          // Fetch AI match summary
          if (isMounted) {
            fetchAIMatchSummary(transformedMatch, events, stats, apiBaseUrl, { current: isMounted });
          }
        } else {
          throw new Error('Invalid API response structure');
        }
      } catch (error) {
        if (isMounted) {
          setError(error.message);
          console.error('Error fetching match details:', error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMatchDetails();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Filter goals from events - API returns event_type, not type
  const goals = events.filter(event => {
    const eventType = (event.event_type || '').toLowerCase();
    return eventType.includes('goal') && !eventType.includes('missed');
  });

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
  const matchDate = new Date(match.fixture.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const venueName = match.fixture.venue.name;
  const matchweek = match.fixture.matchweek;
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

      {/* AI Match Narrative */}
      {match && (
        <motion.div
          variants={cardVariants}
          className="bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-neutral-800 dark:via-neutral-700 dark:to-neutral-800 rounded-xl shadow-lg p-8 border-l-4 border-primary"
        >
          <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white mb-4">
            AI Match Narrative
          </h2>
          {aiSummaryLoading && (
            <div className="flex items-center justify-center py-8">
              <FaSpinner className="animate-spin text-2xl text-primary mr-3" />
              <p className="text-gray-600 dark:text-gray-400">Generating match narrative...</p>
            </div>
          )}
          {aiSummaryError && (
            <div className="text-red-600 dark:text-red-400 text-sm">
              Unable to load AI narrative: {aiSummaryError}
            </div>
          )}
          {aiSummary && (
            <div className="relative">
              {/* Quote decoration */}
              <div className="absolute -top-2 -left-2 text-6xl text-primary opacity-20 font-serif">"</div>
              <blockquote className="text-lg leading-relaxed text-gray-800 dark:text-gray-200 italic pl-8 py-4">
                {aiSummary.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="mb-4 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </blockquote>
            </div>
          )}
        </motion.div>
      )}

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
              className="relative inline-block"
              whileHover={{ scale: 1.02 }}
              onMouseEnter={() => setHoveredElement('result')}
              onMouseLeave={() => setHoveredElement(null)}
            >
              <motion.div
                className="relative bg-gradient-to-br from-[#38003C] via-[#4a0052] to-[#38003C] rounded-2xl p-8 md:p-10 shadow-2xl overflow-hidden"
                animate={{
                  boxShadow: hoveredElement === 'result' 
                    ? '0 20px 60px rgba(56, 0, 60, 0.4), 0 0 30px rgba(0, 255, 133, 0.2)' 
                    : '0 10px 40px rgba(56, 0, 60, 0.3)'
                }}
                transition={{ duration: 0.3 }}
              >
                {/* Decorative background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-[#00FF85] rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 right-0 w-40 h-40 bg-[#00FF85] rounded-full blur-3xl"></div>
                </div>
                
                {/* Score Display */}
                <div className="relative z-10">
                  <motion.div
                    className="text-7xl md:text-8xl font-heading font-bold text-white mb-2 tracking-tight"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    {result}
                  </motion.div>
                  
                  {/* Subtle divider line */}
                  <motion.div
                    className="h-1 w-24 bg-gradient-to-r from-transparent via-[#00FF85] to-transparent mx-auto mt-4 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: 96 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  />
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Match Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              className="p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg"
              whileHover={{ scale: 1.02, x: 4 }}
            >
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Date</p>
              <p className="font-semibold text-gray-900 dark:text-white">{matchDate}</p>
            </motion.div>
            <motion.div
              className="p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg"
              whileHover={{ scale: 1.02, x: 4 }}
            >
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Venue</p>
              <p className="font-semibold text-gray-900 dark:text-white">{venueName}</p>
            </motion.div>
            {matchweek && (
              <motion.div
                className="p-4 bg-gray-50 dark:bg-neutral-700 rounded-lg"
                whileHover={{ scale: 1.02, x: 4 }}
              >
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Gameweek</p>
                <p className="font-semibold text-gray-900 dark:text-white">GW {matchweek}</p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Match Statistics Dashboard */}
      {matchStats && (matchStats.home || matchStats.away) && (
        <motion.div variants={cardVariants}>
          <MatchStatsDashboard
            homeStats={matchStats.home}
            awayStats={matchStats.away}
            homeTeamName={match.teams.home.name}
            awayTeamName={match.teams.away.name}
            homeLogoUrl={match.teams.home.logoUrl}
            awayLogoUrl={match.teams.away.logoUrl}
          />
        </motion.div>
      )}

      {/* Head-to-Head Comparison Section */}
      {h2hData && (
        <motion.div variants={cardVariants}>
          <H2HComparison
            h2hData={h2hData}
            homeLogoUrl={match.teams.home.logoUrl}
            awayLogoUrl={match.teams.away.logoUrl}
          />
        </motion.div>
      )}
      {!h2hData && (
        <motion.div variants={cardVariants} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">
            ⚠️ H2H Data Debug: h2hData is {h2hData === null ? 'null' : h2hData === undefined ? 'undefined' : 'falsy'}
          </p>
        </motion.div>
      )}

      {/* Match Momentum Chart */}
      {events.length > 0 && (
        <motion.div variants={cardVariants}>
          <MomentumChart
            events={events}
            homeTeamId={match.teams.home.id}
            homeTeamName={match.teams.home.name}
            awayTeamId={match.teams.away.id}
            awayTeamName={match.teams.away.name}
          />
        </motion.div>
      )}

      {/* Shot Map */}
      {events.length > 0 && (
        <motion.div variants={cardVariants}>
          <ShotMap
            events={events}
            homeTeamId={match.teams.home.id}
            homeTeamName={match.teams.home.name}
            awayTeamId={match.teams.away.id}
            awayTeamName={match.teams.away.name}
          />
        </motion.div>
      )}

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
                        {goal.player_id ? (
                          <Link
                            to={`/players/${goal.player_id}`}
                            className="text-primary hover:text-accent hover:underline font-semibold transition-colors"
                          >
                            {goal.player_name || 'Unknown'}
                          </Link>
                        ) : (
                          <span className="font-semibold">{goal.player_name || 'Unknown'}</span>
                        )}
                        {' '}({goal.team_name || 'Unknown'}) - {goal.minute || 0}'
                        {goal.is_own_goal && ' (Own Goal)'}
                        {goal.is_penalty && ' (Penalty)'}
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
                      Watch related content of this match on YouTube
                    </a>
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Match Timeline Section */}
      {events.length > 0 && (
        <motion.div
          variants={cardVariants}
          className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6"
        >
          <MatchTimeline 
            events={events} 
            homeTeam={match.teams.home.name} 
            awayTeam={match.teams.away.name} 
          />
        </motion.div>
      )}
    </motion.div>
  );
};

export default MatchDetail;
