import { Link, useLocation } from 'react-router-dom';
import { FaTrophy, FaUsers, FaCalendarAlt, FaUser, FaHome } from 'react-icons/fa';

const Navbar = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Home', icon: FaHome },
    { path: '/standings', label: 'Standings', icon: FaTrophy },
    { path: '/clubs', label: 'Clubs', icon: FaUsers },
    { path: '/matches', label: 'Matches', icon: FaCalendarAlt },
    { path: '/players', label: 'Players', icon: FaUser },
  ];

  return (
    <nav className="bg-primary text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <h1 className="text-xl font-heading font-bold">Premier League Analytics</h1>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive(path)
                    ? 'bg-accent text-primary font-semibold'
                    : 'hover:bg-primary/80 hover:text-accent'
                }`}
              >
                <Icon className="text-sm" />
                <span>{label}</span>
              </Link>
            ))}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <select
              value={location.pathname}
              onChange={(e) => window.location.href = e.target.value}
              className="bg-primary border border-accent text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
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
    </nav>
  );
};

export default Navbar;
