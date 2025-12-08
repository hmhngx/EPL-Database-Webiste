import { FaFutbol, FaTrophy } from 'react-icons/fa';

const StatsSummary = ({ totalMatches, wins }) => {
  const winPercentage = totalMatches ? ((wins / totalMatches) * 100).toFixed(2) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-secondary hover:shadow-xl transition-shadow">
        <div className="flex flex-col items-center">
          <FaFutbol className="text-4xl text-primary mb-3" />
          <p className="text-gray-600 text-sm font-medium mb-1">Total Matches</p>
          <span className="text-3xl font-heading font-bold text-gray-900">{totalMatches}</span>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-secondary hover:shadow-xl transition-shadow">
        <div className="flex flex-col items-center">
          <FaTrophy className="text-4xl text-primary mb-3" />
          <p className="text-gray-600 text-sm font-medium mb-1">Wins</p>
          <span className="text-3xl font-heading font-bold text-gray-900">{wins}</span>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-secondary hover:shadow-xl transition-shadow">
        <div className="flex flex-col items-center">
          <FaFutbol className="text-4xl text-primary mb-3" />
          <p className="text-gray-600 text-sm font-medium mb-1">Win %</p>
          <span className="text-3xl font-heading font-bold text-gray-900">{winPercentage}%</span>
        </div>
      </div>
    </div>
  );
};

export default StatsSummary;