import { motion } from 'framer-motion';

/**
 * TeamLogo Component
 * Displays team logo with fallback to ui-avatars if logo_url is null
 * 
 * @param {string} logoUrl - Logo URL from database (can be null)
 * @param {string} teamName - Team name for fallback avatar
 * @param {string} className - Additional CSS classes
 * @param {object} motionProps - Additional motion props for animations
 */
const TeamLogo = ({ logoUrl, teamName, className = '', motionProps = {} }) => {
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName || 'Team')}&background=38003C&color=fff&size=128`;
  const imageUrl = logoUrl || fallbackUrl;

  if (motionProps && Object.keys(motionProps).length > 0) {
    return (
      <motion.img
        src={imageUrl}
        alt={teamName || 'Team logo'}
        className={className}
        {...motionProps}
        onError={(e) => {
          // Fallback to ui-avatars if image fails to load
          if (e.target.src !== fallbackUrl) {
            e.target.src = fallbackUrl;
          }
        }}
      />
    );
  }

  return (
    <img
      src={imageUrl}
      alt={teamName || 'Team logo'}
      className={className}
      onError={(e) => {
        // Fallback to ui-avatars if image fails to load
        if (e.target.src !== fallbackUrl) {
          e.target.src = fallbackUrl;
        }
      }}
    />
  );
};

export default TeamLogo;

