import { Link } from 'react-router-dom';
import { FaTrophy, FaUsers, FaCalendarAlt, FaChartLine } from 'react-icons/fa';

const Home = () => {
  return (
    <div className="space-y-12">
      <div className="text-center py-12">
        <h1 className="text-5xl font-heading font-bold text-gray-900 mb-4">
          Premier League Analytics Hub
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Comprehensive analytics and insights for the English Premier League.
          Explore standings, matches, clubs, and player statistics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          to="/standings"
          className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow group"
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-primary text-white p-3 rounded-lg group-hover:bg-accent group-hover:text-primary transition-colors">
              <FaTrophy className="text-2xl" />
            </div>
            <h2 className="text-xl font-heading font-bold text-gray-900">Standings</h2>
          </div>
          <p className="text-gray-600">
            View current league table with sortable columns and visual highlights for top 4 and relegation zone.
          </p>
        </Link>

        <Link
          to="/matches"
          className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow group"
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-primary text-white p-3 rounded-lg group-hover:bg-accent group-hover:text-primary transition-colors">
              <FaCalendarAlt className="text-2xl" />
            </div>
            <h2 className="text-xl font-heading font-bold text-gray-900">Matches</h2>
          </div>
          <p className="text-gray-600">
            Browse all matches with advanced filtering, grouping by gameweek or month, and interactive charts.
          </p>
        </Link>

        <Link
          to="/clubs"
          className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow group"
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-primary text-white p-3 rounded-lg group-hover:bg-accent group-hover:text-primary transition-colors">
              <FaUsers className="text-2xl" />
            </div>
            <h2 className="text-xl font-heading font-bold text-gray-900">Clubs</h2>
          </div>
          <p className="text-gray-600">
            Explore detailed information about all Premier League clubs, their stats and performance.
          </p>
        </Link>

        <Link
          to="/players"
          className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow group"
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-primary text-white p-3 rounded-lg group-hover:bg-accent group-hover:text-primary transition-colors">
              <FaChartLine className="text-2xl" />
            </div>
            <h2 className="text-xl font-heading font-bold text-gray-900">Players</h2>
          </div>
          <p className="text-gray-600">
            Access comprehensive player statistics, performance metrics, and detailed analytics.
          </p>
        </Link>
      </div>

      <div className="bg-gradient-to-r from-primary to-accent rounded-xl shadow-lg p-8 text-white">
        <h2 className="text-3xl font-heading font-bold mb-4">About This Platform</h2>
        <p className="text-lg mb-4">
          This Premier League Analytics Hub provides real-time data and insights powered by API-Football.
          All data is fetched from our backend API and displayed with interactive visualizations.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div>
            <h3 className="font-heading font-semibold text-lg mb-2">Real-time Data</h3>
            <p className="text-sm opacity-90">Live updates from official Premier League sources</p>
          </div>
          <div>
            <h3 className="font-heading font-semibold text-lg mb-2">Advanced Analytics</h3>
            <p className="text-sm opacity-90">Interactive charts and visualizations</p>
          </div>
          <div>
            <h3 className="font-heading font-semibold text-lg mb-2">Comprehensive Stats</h3>
            <p className="text-sm opacity-90">Detailed statistics for teams and players</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
