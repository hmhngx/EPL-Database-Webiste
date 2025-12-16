import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import logoImage from '/images/EPLdbWebsite.png';

const Home = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  const featureCards = [
    {
      to: '/standings',
      icon: '📊',
      title: 'League Table',
      description: 'Live rankings and form guide.',
    },
    {
      to: '/matches',
      icon: '⚽',
      title: 'Fixtures & Results',
      description: 'Scores, schedules, and details.',
    },
    {
      to: '/clubs',
      icon: '🛡️',
      title: 'Club Profiles',
      description: 'Squads, managers, and histories.',
    },
    {
      to: '/players',
      icon: '👤',
      title: 'Players',
      description: 'Player stats and performance metrics.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#38003C] relative overflow-hidden">
      {/* Background gradient mesh effect */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-raspberry rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary rounded-full blur-3xl"></div>
      </div>

      <motion.div
        className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Section */}
        <motion.div
          className="text-center mb-16 sm:mb-20 lg:mb-24"
          variants={itemVariants}
        >
          {/* Logo */}
          <motion.div
            className="mb-8 flex justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <img
              src={logoImage}
              alt="Premier League Analytics Hub Logo"
              className="w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 object-contain drop-shadow-[0_0_30px_rgba(0,255,133,0.5)]"
            />
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-heading font-bold text-white uppercase mb-4 tracking-tight"
            variants={itemVariants}
          >
            Premier League Analytics
          </motion.h1>

          {/* Subtext */}
          <motion.p
            className="text-lg sm:text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed"
            variants={itemVariants}
          >
            Comprehensive stats, live scores, and historical data.
          </motion.p>
        </motion.div>

        {/* Navigation Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-10 max-w-7xl mx-auto"
          variants={containerVariants}
        >
          {featureCards.map((card) => (
            <motion.div
              key={card.to}
              variants={cardVariants}
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <Link
                to={card.to}
                className="block h-full group"
              >
                <motion.div
                  className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-8 sm:p-10 h-full border-2 border-transparent hover:border-accent transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(0,255,133,0.4)]"
                  whileHover={{
                    boxShadow: '0 0 40px rgba(0, 255, 133, 0.6)',
                  }}
                >
                  {/* Icon */}
                  <div className="text-6xl sm:text-7xl mb-6 text-center group-hover:scale-110 transition-transform duration-300">
                    {card.icon}
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white uppercase mb-3 text-center group-hover:text-accent transition-colors duration-300">
                    {card.title}
                  </h2>

                  {/* Description */}
                  <p className="text-gray-300 text-center text-base sm:text-lg leading-relaxed">
                    {card.description}
                  </p>

                  {/* Hover indicator */}
                  <div className="mt-6 flex justify-center">
                    <motion.div
                      className="w-0 h-0.5 bg-accent group-hover:w-full transition-all duration-300"
                      initial={{ width: 0 }}
                      whileHover={{ width: '100%' }}
                    />
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Home;
