import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaTrophy, FaUsers, FaCalendarAlt, FaUser, FaHome } from 'react-icons/fa';

const Layout = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Home', icon: FaHome },
    { path: '/standings', label: 'Standings', icon: FaTrophy },
    { path: '/clubs', label: 'Clubs', icon: FaUsers },
    { path: '/matches', label: 'Matches', icon: FaCalendarAlt },
    { path: '/players', label: 'Players', icon: FaUser },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3,
        ease: 'easeIn',
      },
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#38003C]">
      {/* Navbar with purple-to-black gradient */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-gradient-primary text-white shadow-md hover:shadow-lg transition-shadow duration-300"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between h-16 sm:h-20 py-2 sm:py-0">
            <Link
              to="/"
              className="flex items-center space-x-3 mb-2 sm:mb-0 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-primary rounded-md px-2 py-1 transition-all duration-300 hover:opacity-90"
              aria-label="Premier League Analytics - Home"
            >
              <h1 className="text-lg sm:text-xl md:text-2xl font-heading font-bold text-white hover:text-accent transition-colors duration-300">
                Premier League Analytics
              </h1>
            </Link>

            {/* Desktop Navigation */}
            <nav
              className="hidden md:flex items-center space-x-1"
              aria-label="Desktop navigation menu"
            >
              {navLinks.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-primary ${
                    isActive(path)
                      ? 'bg-accent/20 text-accent font-semibold underline underline-offset-4'
                      : 'hover:text-green-400 hover:underline hover:underline-offset-4'
                  }`}
                  aria-current={isActive(path) ? 'page' : undefined}
                  aria-label={`Navigate to ${label} page`}
                >
                  <Icon className="text-sm" aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>

            {/* Mobile Navigation */}
            <div className="md:hidden w-full sm:w-auto" aria-label="Mobile navigation menu">
              <select
                value={location.pathname}
                onChange={(e) => {
                  const targetPath = e.target.value;
                  window.location.href = targetPath;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    window.location.href = e.target.value;
                  }
                }}
                className="w-full sm:w-auto bg-primary/80 border border-secondary/50 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-primary transition-all duration-300 hover:border-secondary"
                aria-label="Select page to navigate"
              >
                {navLinks.map(({ path, label }) => (
                  <option key={path} value={path}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Main Content Area */}
      <main
        className="flex-1 bg-[#38003C] max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16"
        role="main"
        aria-label="Main content"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div variants={pageVariants}>
              <Outlet />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer with EPL-themed design */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative mt-auto overflow-hidden"
        role="contentinfo"
        aria-label="Site footer"
      >
        {/* Gradient background with EPL purple theme */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/95 to-primary/90 dark:from-primary dark:via-primary/95 dark:to-primary/90"></div>
        
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10" style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255, 255, 255, 0.1) 10px,
            rgba(255, 255, 255, 0.1) 20px
          )`
        }}></div>
        
        {/* Top border with accent glow */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent/50 to-transparent"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            {/* Premier League inspired text styling */}
            <p className="text-sm sm:text-base font-body text-white/90 dark:text-white/95 tracking-wide">
              <span className="font-semibold">© 2023/2024 Premier League Analytics Hub.</span>
              <span className="text-white/70 dark:text-white/80 ml-1">Data provided by EPL Data.</span>
            </p>
            
            {/* Decorative accent line */}
            <div className="flex items-center justify-center space-x-2 w-full max-w-md pt-2">
              <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-accent/30"></div>
              <div className="w-2 h-2 rounded-full bg-accent/50"></div>
              <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-accent/30 to-accent/30"></div>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

export default Layout;
