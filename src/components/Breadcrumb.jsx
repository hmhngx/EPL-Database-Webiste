import { Link } from 'react-router-dom';
import { FaChevronRight, FaHome } from 'react-icons/fa';

const Breadcrumb = ({ items }) => {
  return (
    <nav className="flex items-center space-x-2 text-sm mb-6" aria-label="Breadcrumb">
      <Link
        to="/"
        className="text-white/60 hover:text-[#00FF85] transition-colors duration-300"
      >
        <FaHome className="w-4 h-4" />
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <FaChevronRight className="text-white/40 w-3 h-3" />
          {item.to ? (
            <Link
              to={item.to}
              className="text-white/60 hover:text-[#00FF85] transition-colors duration-300"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-white font-semibold">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
};

export default Breadcrumb;
