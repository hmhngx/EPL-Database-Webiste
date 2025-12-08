import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaSpinner, FaBuilding, FaCalendarAlt, FaUsers, FaMapMarkerAlt } from 'react-icons/fa';

const Clubs = () => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/clubs');
        if (!response.ok) throw new Error('Failed to fetch clubs');
        const data = await response.json();
        setClubs(data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClubs();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <FaSpinner className="animate-spin text-4xl text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">Error loading clubs</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">
          Premier League Clubs
        </h1>
        <p className="text-gray-600">Explore all 20 Premier League clubs</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {clubs.map((club) => (
          <Link
            key={club.club_id}
            to={`/clubs/${club.club_id}`}
            className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6 border border-gray-200 hover:border-primary group"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              {club.logo_url ? (
                <img
                  src={club.logo_url}
                  alt={club.name}
                  className="w-24 h-24 object-contain group-hover:scale-110 transition-transform"
                />
              ) : (
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                  <FaBuilding className="text-4xl text-gray-400" />
                </div>
              )}
              
              <div className="w-full">
                <h2 className="text-lg font-heading font-bold text-gray-900 group-hover:text-primary transition-colors">
                  {club.name}
                </h2>
                
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  {club.founded && (
                    <div className="flex items-center justify-center space-x-2">
                      <FaCalendarAlt className="text-gray-400" />
                      <span>Founded {club.founded}</span>
                    </div>
                  )}
                  
                  {club.stadium_name && (
                    <div className="flex items-center justify-center space-x-2">
                      <FaMapMarkerAlt className="text-gray-400" />
                      <span className="truncate">{club.stadium_name}</span>
                    </div>
                  )}
                  
                  {club.stadium_capacity && (
                    <div className="flex items-center justify-center space-x-2">
                      <FaUsers className="text-gray-400" />
                      <span>{club.stadium_capacity.toLocaleString()} capacity</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Clubs;
