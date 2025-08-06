import { FaSearch, FaFilter, FaHome, FaMapMarkerAlt, FaTrophy, FaTimes, FaEquals } from 'react-icons/fa';
import "../styles/Filters.css";

const Filters = ({ searchQuery, setSearchQuery, resultFilter, setResultFilter, venueFilter, setVenueFilter }) => {
  return (
    <div className="filters">
      <div className="search-container">
        <FaSearch className="search-icon" />
        <input
          type="text"
          placeholder="Search by opponent..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-bar"
        />
      </div>
      
      <div className="filter-container">
        <FaFilter className="filter-icon" />
        <select 
          value={resultFilter} 
          onChange={(e) => setResultFilter(e.target.value)} 
          className="filter-dropdown result-filter"
        >
          <option value="all">All Results</option>
          <option value="win">Wins</option>
          <option value="loss">Losses</option>
          <option value="draw">Draws</option>
        </select>
      </div>
      
      <div className="filter-container">
        <FaMapMarkerAlt className="filter-icon" />
        <select 
          value={venueFilter} 
          onChange={(e) => setVenueFilter(e.target.value)} 
          className="filter-dropdown venue-filter"
        >
          <option value="all">All Venues</option>
          <option value="home">Home</option>
          <option value="away">Away</option>
        </select>
      </div>
    </div>
  );
};

export default Filters;