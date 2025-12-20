import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaPlay } from 'react-icons/fa';

/**
 * LitePlayer Component
 * Shows YouTube thumbnail, replaces with iframe on click
 * 
 * @param {string} youtubeId - YouTube video ID (11 characters)
 * @param {string} className - Additional CSS classes
 */
const LitePlayer = ({ youtubeId, className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!youtubeId || youtubeId.length !== 11) {
    return null;
  }

  const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
  const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1`;

  if (isPlaying) {
    return (
      <div className={`relative w-full ${className}`} style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={embedUrl}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute top-0 left-0 w-full h-full rounded-lg"
        />
      </div>
    );
  }

  return (
    <motion.div
      className={`relative w-full cursor-pointer group ${className}`}
      style={{ paddingBottom: '56.25%' }}
      onClick={() => setIsPlaying(true)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <img
        src={thumbnailUrl}
        alt="Video thumbnail"
        className="absolute top-0 left-0 w-full h-full object-cover rounded-lg"
        onError={(e) => {
          // Fallback to default thumbnail if maxresdefault fails
          e.target.src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-40 transition-all duration-300 rounded-lg">
        <motion.div
          className="bg-red-600 rounded-full p-4 shadow-lg"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <FaPlay className="text-white text-2xl ml-1" />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LitePlayer;

