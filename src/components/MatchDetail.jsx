import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { FaFutbol, FaVideo, FaTrophy, FaTimes, FaHandshake } from 'react-icons/fa';
import { highlightVideos } from '../data/highlightVideos'; 
import '../styles/MatchDetail.css';

const MatchDetail = () => {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightLink, setHighlightLink] = useState(null);

  useEffect(() => {
    const fetchMatchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use internal API instead of api-sports.io
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
          // Transform API response to match component format
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
                long: 'Finished', // Assuming all matches in DB are finished
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

          // Set highlight link
          if (highlightVideos[id]) {
            setHighlightLink(highlightVideos[id]);
          } else {
            const matchTitle = `${matchData.data.home_club} vs ${matchData.data.away_club}`;
            const searchQuery = `${matchTitle} 2023/2024 highlights`;
            const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
            setHighlightLink(youtubeSearchUrl);
          }
          
          // Note: Events (goals, cards, etc.) are not available in current DB schema
          // This would need to be added to the database or fetched from another source
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading match details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
          <Link to="/matches" className="text-primary hover:text-accent mt-4 inline-block">
            ← Back to Matches
          </Link>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-semibold">Match not found</p>
          </div>
          <Link to="/matches" className="text-primary hover:text-accent mt-4 inline-block">
            ← Back to Matches
          </Link>
        </div>
      </div>
    );
  }

  const result = `${match.goals.home} - ${match.goals.away}`;
  const matchDate = new Date(match.fixture.date).toLocaleString();
  const venueName = match.fixture.venue.name;
  const venueCity = match.fixture.venue.city;
  const referee = match.fixture.referee || 'Not available';

  // Calculate match result for form display
  const homeGoals = match.goals.home;
  const awayGoals = match.goals.away;
  let resultType, resultIcon, resultClass;
  
  if (homeGoals > awayGoals) {
    resultType = 'W';
    resultIcon = <FaTrophy />;
    resultClass = 'win';
  } else if (homeGoals < awayGoals) {
    resultType = 'L';
    resultIcon = <FaTimes />;
    resultClass = 'loss';
  } else {
    resultType = 'D';
    resultIcon = <FaHandshake />;
    resultClass = 'draw';
  }

  const isEmbedLink = highlightLink && highlightLink.includes('youtube.com/embed');

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <div className="match-detail">
          <h1>Match Details</h1>
          
          {/* Result Form Display */}
          <div className="result-form">
            <div className={`result-indicator ${resultClass}`}>
              <div className="result-icon">
                {resultIcon}
              </div>
              <div className="result-letter">
                {resultType}
              </div>
              <div className="result-label">
                {resultType === 'W' ? 'WIN' : resultType === 'L' ? 'LOSS' : resultType === 'D' ? 'DRAW' : 'TBD'}
              </div>
            </div>
          </div>

          <div className="match-info">
            <h2 className="text-2xl font-heading font-bold text-gray-900 mb-4">
              {match.teams.home.name} vs {match.teams.away.name}
            </h2>
            <div className="space-y-2 text-gray-700">
              <p><strong>Result:</strong> {result}</p>
              <p><strong>Date:</strong> {matchDate}</p>
              <p><strong>Venue:</strong> {venueName}, {venueCity}</p>
              <p><strong>Referee:</strong> {referee}</p>
              <p><strong>Status:</strong> {match.fixture.status.long}</p>
            </div>
          </div>

          {/* Goal Scorers Section */}
          <div className="goal-scorers">
            <h3>
              <FaFutbol className="section-icon" /> Goal Scorers
            </h3>
            {goals.length > 0 ? (
              <ul>
                {goals.map((goal, index) => (
                  <li key={index}>
                    {goal.player.name} ({goal.team.name}) - {goal.time.elapsed}'
                    {goal.time.extra && `+${goal.time.extra}'`}
                    {goal.detail === 'Own Goal' && ' (Own Goal)'}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No goals scored in this match.</p>
            )}
          </div>

          {/* YouTube Highlights Section */}
          <div className="highlights">
            <h3>
              <FaVideo className="section-icon" /> Match Highlights
            </h3>
            {highlightLink ? (
              isEmbedLink ? (
                <div className="video-container">
                  <iframe
                    width="100%"
                    height="315"
                    src={highlightLink}
                    title="Match Highlights"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              ) : (
                <p>
                  <a href={highlightLink} target="_blank" rel="noopener noreferrer" className="highlight-link">
                    Watch highlights on YouTube
                  </a>
                </p>
              )
            ) : (
              <p>Highlight video not available.</p>
            )}
          </div>

          <Link to="/matches" className="inline-block mt-6 px-4 py-2 bg-primary text-white rounded-lg hover:bg-accent hover:text-primary transition-colors">
            ← Back to Matches
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MatchDetail;