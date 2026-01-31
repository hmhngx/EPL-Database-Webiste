import PropTypes from 'prop-types';

/**
 * NeonTooltip - High-performance tooltip component using Tailwind's group hover
 * Zero JavaScript overhead, pure CSS transitions
 */
const NeonTooltip = ({ content, children, position = 'top' }) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative flex items-center justify-center group">
      {children}
      <div
        className={`absolute ${positionClasses[position]} opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100 bg-[#1a1a1a] border border-[#00FF85]/30 text-white text-xs px-2 py-1 rounded shadow-xl z-50 whitespace-nowrap pointer-events-none`}
      >
        {content}
        {/* Arrow */}
        <div
          className={`absolute ${
            position === 'top'
              ? 'top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#00FF85]/30'
              : position === 'bottom'
              ? 'bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-[#00FF85]/30'
              : position === 'left'
              ? 'left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-[#00FF85]/30'
              : 'right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#00FF85]/30'
          }`}
        />
      </div>
    </div>
  );
};

NeonTooltip.propTypes = {
  content: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  position: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
};

export default NeonTooltip;
