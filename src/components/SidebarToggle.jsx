import { motion } from 'framer-motion';
import { FaBars, FaTimes } from 'react-icons/fa';

const SidebarToggle = ({ isOpen, onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      className="fixed top-5 left-5 z-50 p-3 bg-[#0a0a0a] border-2 border-[#00FF85]/30 rounded-lg text-[#00FF85] hover:border-[#00FF85] hover:bg-[#00FF85]/10 transition-all duration-300 shadow-lg shadow-[#00FF85]/20 hover:shadow-[#00FF85]/40"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      aria-expanded={isOpen}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isOpen ? 90 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {isOpen ? (
          <FaTimes className="text-lg" />
        ) : (
          <FaBars className="text-lg" />
        )}
      </motion.div>
    </motion.button>
  );
};

export default SidebarToggle;
