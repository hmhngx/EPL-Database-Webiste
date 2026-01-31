import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import SidebarToggle from './SidebarToggle';

const Layout = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const location = useLocation();

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
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Sidebar Toggle Button */}
      <SidebarToggle
        isOpen={isSidebarOpen}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 bg-[#38003C] transition-all duration-500 ${
          isSidebarOpen ? 'lg:ml-[280px]' : 'ml-0'
        }`}
        role="main"
        aria-label="Main content"
      >
        <div className="max-w-7xl mx-auto px-6 py-8 sm:py-12 lg:py-16">
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
        </div>
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
