# Premier League Analytics Hub

A comprehensive full-stack web application for analyzing and visualizing Premier League 2023/24 season data. Built with React, Express.js, and PostgreSQL (Supabase), featuring real-time statistics, interactive charts, and detailed match/club analytics.

## 🎯 Features

### Frontend
- **Interactive Dashboard**: Real-time league standings with dynamic calculations and point adjustments
- **Club Analytics**: Detailed club profiles with statistics, squad information, and performance metrics
- **Match Tracking**: Comprehensive match details with results, events, and YouTube highlights
- **Player Database**: Complete player information with position, nationality, and club associations
- **Advanced Data Visualization**: 
  - Interactive charts using Chart.js and Recharts (Bar, Pie, Line, Scatter)
  - Cross-filtering between charts (venue-based filtering)
  - Tactical quadrant analysis with bisector logic (Attack/Defense scatterplot)
  - Cumulative statistics and trendlines
- **Media Optimization**: Club logos with Supabase Storage integration and fallback to UI-Avatars
- **Responsive Design**: Modern UI with dark mode support, smooth animations, and mobile-first approach
- **Performance Optimized**: Lazy loading, code splitting, and optimized rendering

### Backend
- **RESTful API**: Express.js server with comprehensive endpoints
- **Database Integration**: PostgreSQL (Supabase) with normalized schema (3NF)
- **Dynamic Standings**: Real-time league table calculation from match data with point adjustments
- **Point Adjustment System**: Handles PSR (Profit and Sustainability Rules) breaches (e.g., Everton -8, Nottingham Forest -4)
- **Advanced SQL Views**: 
  - `club_analytics_timeseries` view with window functions for cumulative statistics
  - Dynamic position ranking with tie-breakers (Points → GD → GF)
- **Connection Pooling**: Optimized database connections for performance
- **Prepared Statements**: Parameterized queries for security and performance
- **Error Handling**: Comprehensive error handling and logging
- **CORS Support**: Configured for frontend integration

### Data Pipeline
- **ETL Script**: Python-based data ingestion with fuzzy matching and normalization
- **Batch Processing**: Processes 500 rows per transaction (10-50x performance improvement)
- **Data Validation**: Comprehensive validation and error handling
- **Team Name Normalization**: Handles variations (e.g., "Man Utd" → "Manchester United")
- **Data Type Handling**: Automatic comma removal from attendance values (e.g., "21,572" → 21572)
- **YouTube ID Extraction**: Extracts 11-character video IDs from full URLs for efficient storage
- **Matchweek Calculation**: Automatically calculates matchweek from date if not provided
- **Duplicate Prevention**: Automatic duplicate detection and handling

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI library
- **Vite** - Build tool and dev server
- **React Router DOM 7** - Client-side routing
- **Framer Motion** - Animations and transitions
- **Chart.js / React-Chartjs-2** - Data visualization
- **Tailwind CSS** - Utility-first CSS framework
- **React Icons** - Icon library

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database (via Supabase)
- **pg** - PostgreSQL client with connection pooling
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

### Data Processing
- **Python 3.8+** - ETL scripting
- **pandas** - Data manipulation
- **psycopg2** - PostgreSQL adapter
- **RapidFuzz** - Fuzzy string matching

### Development Tools
- **ESLint** - Code linting
- **Vitest** - Testing framework
- **Testing Library** - React component testing

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.8+ (for ETL scripts)
- **PostgreSQL** database (Supabase recommended)
- **Git** for version control

## 🚀 Quick Start

### 1. Clone the Repository

```powershell
git clone <repository-url>
cd football-api
```

### 2. Install Dependencies

```powershell
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the project root:

```powershell
# Copy the example file
Copy-Item server\env.example .env
```

Edit `.env` and add your configuration:

```env
# Supabase Database Connection
SUPABASE_CONNECTION_STRING=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Getting Your Supabase Connection String:**
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Copy the **Connection string** (URI format)

### 4. Set Up Database Schema

1. Open Supabase Dashboard → **SQL Editor**
2. Copy contents of `database/schema.sql`
3. Paste and click **Run**

For detailed database setup, see [`database/README.md`](database/README.md).

### 5. Load Data (Optional)

If you have data files, use the ETL script:

```powershell
cd etl
pip install -r requirements.txt
# Configure .env in etl directory
python etl_script.py
```

For detailed ETL instructions, see [`etl/README.md`](etl/README.md).

### 6. Start the Application

**Terminal 1 - Backend Server:**
```powershell
npm run server
```

**Terminal 2 - Frontend Development Server:**
```powershell
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## 📁 Project Structure

```
football-api/
├── src/                    # Frontend React application
│   ├── components/         # Reusable React components
│   │   ├── __tests__/      # Component tests
│   │   └── ...
│   ├── pages/              # Page components (routes)
│   ├── styles/             # CSS stylesheets
│   ├── App.jsx             # Main application component
│   └── main.jsx            # Application entry point
├── server/                 # Backend Express.js server
│   ├── routes/             # API route handlers
│   │   ├── clubs.js
│   │   ├── matches.js
│   │   ├── players.js
│   │   └── standings.js
│   ├── server.js           # Express server setup
│   └── README.md           # Server documentation
├── database/               # Database schema and migrations
│   ├── migrations/         # Database migration scripts
│   ├── schema.sql         # Main database schema
│   └── README.md          # Database documentation
├── etl/                    # Data extraction, transformation, loading
│   ├── etl_script.py       # Main ETL script
│   ├── requirements.txt    # Python dependencies
│   └── README.md           # ETL documentation
├── public/                 # Static assets
├── package.json            # Node.js dependencies
└── README.md              # This file
```

## 🔌 API Endpoints

### Standings
- `GET /api/standings` - Get league standings with point adjustments

### Clubs
- `GET /api/clubs` - List all clubs
- `GET /api/clubs/:id` - Get club details
- `GET /api/clubs/:id/squad` - Get club squad (players)

### Matches
- `GET /api/matches` - Get all matches (supports `?matchweek` and `?orderBy` query parameters)
- `GET /api/matches/:id` - Get match details with YouTube highlights

### Players
- `GET /api/players` - List all players

### Analytics
- `GET /api/analytics/club/:id` - Get club timeseries analytics (cumulative stats, position by matchweek)

### Health Check
- `GET /health` - Server and database health check

For detailed API documentation, see [`server/README.md`](server/README.md).

## 🧪 Testing

Run the test suite:

```powershell
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## 🏗️ Building for Production

```powershell
# Build frontend
npm run build

# Preview production build
npm run preview
```

## 📝 Available Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run server` - Start Express backend server
- `npm run server:dev` - Start server with auto-reload (Node.js 18+)
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SUPABASE_CONNECTION_STRING` | PostgreSQL connection string | Yes | - |
| `PORT` | Backend server port | No | 5000 |
| `NODE_ENV` | Environment mode | No | development |
| `FRONTEND_URL` | Frontend URL for CORS | No | http://localhost:5173 |

### Vite Configuration

The Vite dev server is configured to proxy `/api/*` requests to the backend server at `http://localhost:5000`. This is configured in `vite.config.js`.

## 🐛 Troubleshooting

### Backend Server Not Starting

**Issue**: `ECONNREFUSED` errors or server won't start

**Solutions**:
1. Verify `.env` file exists and has correct Supabase connection string
2. Check that port 5000 is not already in use
3. Ensure database schema is set up correctly
4. Check Supabase firewall settings allow your IP

### Database Connection Errors

**Issue**: Cannot connect to Supabase database

**Solutions**:
1. Verify connection string format is correct
2. Check Supabase project is active
3. Ensure database password is correct (URL-encode special characters)
4. Check Supabase dashboard for connection issues

### Frontend Not Loading Data

**Issue**: Frontend shows errors or no data

**Solutions**:
1. Ensure both servers are running (backend on port 5000, frontend on port 5173)
2. Check browser console for errors
3. Verify API endpoints are responding: `curl http://localhost:5000/health`
4. Check CORS configuration in backend

### Port Already in Use

**Issue**: Port 5000 or 5173 already in use

**Solutions**:
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace <PID> with actual process ID)
taskkill /PID <PID> /F

# Or change PORT in .env file
```

## 📚 Documentation

- **[Server Documentation](server/README.md)** - Backend API documentation
- **[Database Documentation](database/README.md)** - Database schema and setup
- **[ETL Documentation](etl/README.md)** - Data ingestion guide
- **[Migrations Documentation](database/migrations/README.md)** - Database migrations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

Apache License, Version 2.0

## 👤 Author

**Harrison Nguyen, Nam Nguyen**

## 🙏 Acknowledgments

- Data provided by EPL Data
- Built with React, Express.js, and Supabase
- Icons by React Icons
- Charts by Chart.js

---

**© 2023/2024 Premier League Analytics Hub. Data provided by EPL Data.**
