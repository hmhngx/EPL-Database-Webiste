import { FaMapMarkerAlt, FaCalendarAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const MatchList = ({ matches }) => {
  if (!matches || matches.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No matches found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {matches.map(match => {
        const date = new Date(match.fixture.date);
        const formattedDate = date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
        const formattedTime = date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        return (
          <Link 
            to={`/match/${match.fixture.id}`} 
            key={match.fixture.id}
            className="block"
          >
            <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 border border-gray-200 hover:border-primary">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2 text-gray-500 text-sm">
                  <FaCalendarAlt />
                  <span>{formattedDate}</span>
                  <span>{formattedTime}</span>
                </div>
                <FaMapMarkerAlt className="text-gray-400" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{match.teams.home.name}</span>
                  <span className="text-lg font-bold text-primary">{match.goals.home}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{match.teams.away.name}</span>
                  <span className="text-lg font-bold text-primary">{match.goals.away}</span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default MatchList;