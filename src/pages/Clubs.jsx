import { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaSpinner, FaBuilding, FaCalendarAlt, FaUsers, FaMapMarkerAlt, FaTrophy } from 'react-icons/fa';

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
  };

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
      {/* Top Overview Card with Purple Gradient Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-primary to-primary-dark rounded-xl shadow-lg overflow-hidden"
      >
        <div className="bg-gradient-primary p-6">
          <h1 className="text-3xl font-heading font-bold text-white mb-2 flex items-center gap-3">
            <FaTrophy className="text-accent" />
            Premier League Clubs
          </h1>
          <p className="text-white/90">Explore all 20 Premier League clubs</p>
        </div>
        <div className="bg-white/95 dark:bg-neutral-800/95 p-6">
          <p className="text-gray-700 dark:text-gray-300 font-body">
            Discover detailed information about each club, including squad details, match history, and performance statistics.
          </p>
        </div>
      </motion.div>

      {/* Premium Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6"
      >
        {clubs.map((club) => (
          <motion.div
            key={club.team_id}
            variants={cardVariants}
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ duration: 0.3 }}
          >
            <Link
              to={`/teams/${club.team_id}`}
              className="block h-full"
            >
              <motion.div
                className="bg-white dark:bg-neutral-800 rounded-xl shadow-md hover:shadow-[0_0_20px_rgba(4,245,255,0.3)] transition-all duration-300 p-6 border-2 border-transparent hover:border-secondary h-full flex flex-col"
                whileHover={{ borderColor: '#04f5ff' }}
              >
                <div className="flex flex-col items-center text-center space-y-4 flex-1">
                  {club.logo_url ? (
                    <motion.img
                      src={club.logo_url}
                      alt={club.team_name}
                      className="w-24 h-24 object-contain"
                      whileHover={{ 
                        brightness: 1.1,
                        scale: 1.1,
                        filter: 'drop-shadow(0 0 8px rgba(0, 255, 133, 0.4))'
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-200 dark:bg-neutral-700 rounded-full flex items-center justify-center">
                      <FaBuilding className="text-4xl text-gray-400 dark:text-gray-500" />
                    </div>
                  )}
                  
                  <div className="w-full flex-1 flex flex-col">
                    <h2 className="text-lg font-heading font-bold text-gray-900 dark:text-white group-hover:text-primary dark:group-hover:text-accent transition-colors mb-3">
                      {club.team_name}
                    </h2>
                    
                    <div className="mt-auto space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      {club.founded_year && (
                        <div className="flex items-center justify-center space-x-2">
                          <FaCalendarAlt className="text-gray-400 dark:text-gray-500" />
                          <span>Founded {club.founded_year}</span>
                        </div>
                      )}
                      
                      {club.stadium_name && (
                        <div className="flex items-center justify-center space-x-2">
                          <FaMapMarkerAlt className="text-gray-400 dark:text-gray-500" />
                          <span className="truncate">{club.stadium_name}</span>
                        </div>
                      )}
                      
                      {club.stadium_capacity && (
                        <div className="flex items-center justify-center space-x-2">
                          <FaUsers className="text-gray-400 dark:text-gray-500" />
                          <span>{club.stadium_capacity.toLocaleString()} capacity</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default Clubs;
