import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaFilter, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const ChartFilters = ({ 
  venue, 
  onVenueChange, 
  gameweekRange, 
  onGameweekRangeChange, 
  selectedTeams, 
  onSelectedTeamsChange, 
  allTeams 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleTeamToggle = (teamId) => {
    if (selectedTeams.includes(teamId)) {
      onSelectedTeamsChange(selectedTeams.filter(id => id !== teamId));
    } else {
      onSelectedTeamsChange([...selectedTeams, teamId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedTeams.length === allTeams.length) {
      onSelectedTeamsChange([]);
    } else {
      onSelectedTeamsChange(allTeams.map(team => team.team_id));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 mb-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FaFilter className="text-primary" />
          <h3 className="text-lg font-heading font-bold text-gray-900 dark:text-white">
            Chart Filters
          </h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      </div>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Venue Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Venue
            </label>
            <select
              value={venue}
              onChange={(e) => onVenueChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Matches</option>
              <option value="home">Home Only</option>
              <option value="away">Away Only</option>
            </select>
          </div>

          {/* Gameweek Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Gameweek Range: {gameweekRange[0]} - {gameweekRange[1]}
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                min="1"
                max="38"
                value={gameweekRange[0]}
                onChange={(e) => {
                  const start = Math.max(1, Math.min(38, parseInt(e.target.value) || 1));
                  onGameweekRangeChange([start, Math.max(start, gameweekRange[1])]);
                }}
                className="w-20 px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
              />
              <span className="text-gray-600 dark:text-gray-400">to</span>
              <input
                type="number"
                min="1"
                max="38"
                value={gameweekRange[1]}
                onChange={(e) => {
                  const end = Math.max(1, Math.min(38, parseInt(e.target.value) || 38));
                  onGameweekRangeChange([Math.min(gameweekRange[0], end), end]);
                }}
                className="w-20 px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Team Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Teams ({selectedTeams.length} selected)
              </label>
              <button
                onClick={handleSelectAll}
                className="text-xs text-primary hover:underline"
              >
                {selectedTeams.length === allTeams.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-neutral-600 rounded-lg p-2 bg-white dark:bg-neutral-700">
              {allTeams.map((team) => (
                <label
                  key={team.team_id}
                  className="flex items-center space-x-2 p-1 hover:bg-gray-100 dark:hover:bg-neutral-600 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedTeams.includes(team.team_id)}
                    onChange={() => handleTeamToggle(team.team_id)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {team.team_name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ChartFilters;
