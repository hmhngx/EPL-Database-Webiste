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
        const apiKey = import.meta.env.VITE_FOOTBALL_API_KEY;
        if (!apiKey) throw new Error('API key is missing. Please check your .env file.');

        const matchResponse = await fetch(
          `https://v3.football.api-sports.io/fixtures?id=${id}`,
          { headers: { 'x-apisports-key': apiKey } }
        );

        if (!matchResponse.ok) throw new Error(`HTTP error! Status: ${matchResponse.status}`);
        const matchData = await matchResponse.json();
        if (matchData.response && matchData.response.length > 0) {
          setMatch(matchData.response[0]);

          if (highlightVideos[id]) {
            setHighlightLink(highlightVideos[id]);
          } else {
            const isHome = matchData.response[0].teams.home.id === 33;
            const opponent = isHome ? matchData.response[0].teams.away.name : matchData.response[0].teams.home.name;
            const matchTitle = isHome ? `Manchester United vs ${opponent}` : `${opponent} vs Manchester United`;
            const searchQuery = `${matchTitle} 2023/2024 highlights`;
            const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
            setHighlightLink(youtubeSearchUrl);
          }
        } else {
          throw new Error('Match not found');
        }

        const eventsResponse = await fetch(
          `https://v3.football.api-sports.io/fixtures/events?fixture=${id}`,
          { headers: { 'x-apisports-key': apiKey } }
        );

        if (!eventsResponse.ok) throw new Error(`HTTP error! Status: ${eventsResponse.status}`);
        const eventsData = await eventsResponse.json();
        if (eventsData.response) {
          setEvents(eventsData.response);
        } else {
          throw new Error('No events found for this match');
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchDetails();
  }, [id]);

  const goals = events.filter(event => event.type === 'Goal' && event.detail !== 'Missed Penalty');

  if (loading) {
    return <div className="loading">Loading match details...</div>;
  }

  if (error) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <p className="error">Error: {error}</p>
          <Link to="/" className="back-link">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <p className="error">Match not found</p>
          <Link to="/" className="back-link">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const isHome = match.teams.home.id === 33;
  const opponent = isHome ? match.teams.away.name : match.teams.home.name;
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
            <h2>{isHome ? `Man United vs ${opponent}` : `${opponent} vs Man United`}</h2>
            <p><strong>Result:</strong> {result}</p>
            <p><strong>Date:</strong> {matchDate}</p>
            <p><strong>Venue:</strong> {venueName}, {venueCity}</p>
            <p><strong>Referee:</strong> {referee}</p>
            <p><strong>Status:</strong> {match.fixture.status.long}</p>
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

          <Link to="/" className="back-link">Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );
};

export default MatchDetail;