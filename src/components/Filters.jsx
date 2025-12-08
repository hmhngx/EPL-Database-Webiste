import { FaSearch, FaFilter, FaMapMarkerAlt } from 'react-icons/fa';

const Filters = ({ searchQuery, setSearchQuery, resultFilter, setResultFilter, venueFilter, setVenueFilter, teamId = null }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={teamId ? "Search by opponent name..." : "Search by team name..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border-2 border-secondary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
        />
      </div>
      
      <div className="relative">
        <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <select 
          value={resultFilter} 
          onChange={(e) => setResultFilter(e.target.value)} 
          className="w-full pl-10 pr-4 py-2 border-2 border-secondary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary appearance-none bg-white transition-colors"
        >
          <option value="all">All Results</option>
          {teamId ? (
            <>
              <option value="win">Wins</option>
              <option value="loss">Losses</option>
              <option value="draw">Draws</option>
            </>
          ) : (
            <>
              <option value="win">Wins (Any Team)</option>
              <option value="draw">Draws</option>
            </>
          )}
        </select>
      </div>
      
      {teamId && (
        <div className="relative">
          <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <select 
            value={venueFilter} 
            onChange={(e) => setVenueFilter(e.target.value)} 
            className="w-full pl-10 pr-4 py-2 border-2 border-secondary rounded-lg focus:ring-2 focus:ring-primary focus:border-primary appearance-none bg-white transition-colors"
          >
            <option value="all">All Venues</option>
            <option value="home">Home</option>
            <option value="away">Away</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default Filters;