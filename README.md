# Premier League Season 2023/2024 Analytics

<div align="center">

[![React](https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Recharts](https://img.shields.io/badge/Recharts-Visualization-8884d8?style=for-the-badge)](https://recharts.org/)


[Documentation](#documentation)

</div>

---

## Summary

Full-stack **Premier League 2023/24 analytics** app: standings, matches, clubs, players, time-series charts, head-to-head comparison, Best XI, ScoutGPT (career prediction & comparison), Squad Fragility Index, and optional RAG (natural-language queries over matches with pgvector + OpenAI). Built with React 19, Vite, Express, PostgreSQL (Supabase), and Tailwind.

---

## Key Features

### 📊 Core Analytics
- **League Standings & Rankings**: Real-time table with point adjustments and historical tracking
- **Match Analysis Dashboard**: Detailed match statistics, highlights, and tactical breakdowns
- **Player Performance Metrics**: Comprehensive stats including xG, xAG, progressive passes, and ratings
- **Club Analytics**: Time-series charts tracking cumulative points, goals, and position changes
- **Head-to-Head Comparisons**: Statistical matchups between any two teams

### 🤖 AI-Powered Features

#### ScoutGPT - Career Path Predictor
- **5-Year Market Value Projections**: Visual forecasts using age-curve analysis
- **Similar Player Matching**: Find historical precedents using weighted statistical similarity
- **AI Career Trajectory Analysis**: GPT-4 powered insights on player development
- **Side-by-Side Comparison Mode**: Compare two players for long-term signing decisions
- **Position-Specific Modeling**: Different peak ages for GK/DF/MF/FW
- **Squad Fit Recommendations**: Context-aware advice considering team needs

#### Squad Fragility Index
- **Risk Assessment Dashboard**: Quantify team reliance on individual players
- **Interactive Treemap Visualization**: Size = importance, color = risk level
- **Injury Impact Simulator**: Model consequences of player unavailability
- **Reliance Score Calculation**: Minutes played × performance percentile
- **Drop-off Delta Analysis**: Performance gap between starters and substitutes
- **Replacement Cost Estimation**: Economic impact of losing key players
- **Real-time What-If Scenarios**: Toggle injuries to see immediate impact

#### RAG (Retrieval-Augmented Generation)
- **Natural Language Queries**: Ask questions about matches in plain English
- **Vector Semantic Search**: pgvector-powered similarity matching
- **Citation-Based Responses**: Every AI answer includes source match references
- **Match Summaries**: AI-generated narrative summaries of game events
- **Tactical Insights**: GPT-4 analysis of team performance trends

### 🎨 User Experience
- **Modern Dark Theme**: Sleek purple/green gradient design with glass morphism
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Smooth Animations**: Framer Motion powered transitions and interactions
- **Interactive Charts**: Recharts and Chart.js visualizations with tooltips
- **Advanced Filtering**: Filter matches by date, team, venue, and result
- **Best XI Generator**: Automatic team selection based on ratings

---

## Technical Stack & Provenance

### Backend Infrastructure

| Technology | Version | Purpose | Justification |
|-----------|---------|---------|---------------|
| **Node.js + Express.js** | 18.x LTS | RESTful API server | Industry-standard backend, extensive middleware ecosystem, non-blocking I/O for concurrent requests |
| **PostgreSQL (Supabase)** | 14.x | Primary data store | ACID compliance, window functions for analytics, native UUID support, JSON(B) flexibility |
| **pgvector Extension** | 0.5.1 | Vector similarity search | Native Postgres integration, HNSW indexing (10ms latency), avoids external vector DB complexity |
| **Python 3.8+** | 3.11 | ETL scripting | Pandas for data manipulation, SQLAlchemy ORM, mature NLP libraries (NLTK, spaCy) |
| **Connection Pooling** | pg v8.11 | Database optimization | Max 10 connections, prevents connection exhaustion under load |

### Frontend Architecture

| Technology | Version | Purpose | Justification |
|-----------|---------|---------|---------------|
| **React 19** | 19.0.0 | UI library | Concurrent rendering, automatic batching, Server Components roadmap compatibility |
| **Vite** | 6.x | Build tool | Fast HMR, ESM-native build, optimized dev server |
| **React Router DOM** | 7.0 | Client-side routing | Nested routes, data loaders, error boundaries, type-safe navigation |
| **Tailwind CSS** | 3.4 | Utility-first styling | 90% smaller bundle vs. Bootstrap, JIT compilation, responsive design primitives |
| **Framer Motion** | 12.x | Animation engine | Declarative animations, gesture support, layout animations for formation transitions |

### Visualization & AI

| Technology | Version | Purpose | Justification |
|-----------|---------|---------|---------------|
| **Recharts** | 2.15 | Data visualization | Composable chart components, responsive SVG rendering, animation support |
| **Chart.js** | 4.4 | Interactive charts | Canvas-based rendering (better for large datasets), plugin ecosystem |
| **OpenAI API** | GPT-4 Turbo | LLM inference | 128K context window, function calling, JSON mode, streaming support |
| **text-embedding-3-small** | 1536-dim | Vector embeddings | $0.02/1M tokens, strong retrieval performance, Matryoshka representation (truncatable dimensions) |

### Development Tools

| Tool | Purpose | Configuration |
|------|---------|--------------|
| **ESLint** | Code linting | React plugin, Airbnb style guide, import sorting |
| **Vitest** | Unit testing | Vite-native, 10x faster than Jest, compatible test API |
| **Testing Library** | Component testing | User-centric queries, accessibility enforcement |
| **Git** | Version control | Conventional commits, Husky pre-commit hooks |

---

## Getting Started (Windows Environment)

### Prerequisites

Ensure the following are installed on your Windows laptop:

```powershell
# Verify installations
node --version    # Should be 18.x or higher
npm --version     # Should be 9.x or higher
python --version  # Should be 3.8 or higher
git --version     # Any recent version
```

If not installed:
- **Node.js:** Download from [nodejs.org](https://nodejs.org/) (LTS version recommended)
- **Python:** Download from [python.org](https://www.python.org/downloads/) (check "Add to PATH" during installation)
- **Git:** Download from [git-scm.com](https://git-scm.com/download/win)

### Step 1: Clone Repository

```powershell
# Open PowerShell
git clone https://github.com/your-username/football-api.git
cd football-api
```

### Step 2: Install Dependencies

```powershell
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r etl/requirements.txt
```

Expected output: ~1,200 packages installed in `node_modules/`, Python packages include `pandas`, `psycopg2`, `rapidfuzz`, `openai`.

### Step 3: Database Setup (Supabase)

**3.1. Create Supabase Project:**
1. Sign up at [supabase.com](https://supabase.com) (free tier: 500MB database, 1GB file storage)
2. Create new project (choose region closest to you)
3. Wait 2-3 minutes for provisioning

**3.2. Get Connection String:**
1. Navigate to **Settings → Database**
2. Copy **Connection string** (URI format):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
3. Replace `[YOUR-PASSWORD]` with your database password (set during project creation)

**3.3. Enable pgvector Extension:**
1. Open **SQL Editor** in Supabase Dashboard
2. Run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Verify: `SELECT * FROM pg_extension WHERE extname = 'vector';`

**3.4. Run Database Schema:**
1. Copy contents of `database/schema.sql`
2. Paste into **SQL Editor** and click **Run**
3. Verify tables created: `stadiums`, `team`, `players`, `matches`, `managing`, `managers`, `point_adjustments`

**3.5. Run RAG migration (optional):** Run `database/migrations/create_match_semantic_search_function.sql` in SQL Editor if you use RAG features.

### Step 4: Environment Variables

Create `.env` file in project root:

```powershell
# Copy example file
Copy-Item server\env.example .env

# Edit .env with your credentials
notepad .env
```

Add the following:

```env
# Supabase Database Connection
SUPABASE_CONNECTION_STRING=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres

# OpenAI API Key (for RAG features)
OPENAI_API_KEY=sk-YOUR_OPENAI_KEY

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Getting OpenAI API Key:**
1. Sign up at [platform.openai.com](https://platform.openai.com)
2. Navigate to **API Keys** section
3. Click **Create new secret key**
4. Copy key (starts with `sk-`) and paste into `.env`
5. **Important:** Add $5-10 credit to your OpenAI account for testing (Settings → Billing)

### Step 5: Load Sample Data (Optional)

If you have data files in `data/` directory:

```powershell
# Navigate to ETL directory
cd etl

# Configure environment
Copy-Item ..\server\env.example .env
notepad .env  # Add same credentials as root .env

# Run ETL script
python etl_script.py
```

Expected output:
```
Connecting to database...
Loading stadiums... 20 records inserted
Loading teams... 20 records inserted
Loading players... 652 records inserted
Loading matches... 380 records inserted
ETL process completed successfully!
```

### Step 6: Start Application

**Open two PowerShell terminals:**

**Terminal 1 - Backend Server:**
```powershell
npm run server
```

Expected output:
```
Server running on http://localhost:5000
Database connected successfully
```

**Terminal 2 - Frontend Dev Server:**
```powershell
npm run dev
```

Expected output:
```
VITE v5.0.8  ready in 420 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Step 7: Verify Installation

1. **Open browser:** Navigate to `http://localhost:5173`
2. **Check API health:** Navigate to `http://localhost:5000/health`
   - Should return: `{"status":"ok","database":"connected"}`
3. **Test Standings page:** Click "Standings" in navigation — league table with 20 teams
4. **Test RAG (if embeddings and OpenAI are configured):**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:5000/api/llm/query" -Method POST -ContentType "application/json" -Body '{"query":"Tell me about Arsenal matches"}'
   ```

---

## Project Structure

```
football-api/
├── src/                           # React frontend application
│   ├── components/                # Reusable UI components
│   │   ├── __tests__/             # Component tests (Vitest + Testing Library)
│   │   ├── AITacticalAnalyst.jsx  # RAG-powered match insights
│   │   ├── MatchDetail.jsx        # Match detail view with highlights
│   │   ├── H2HComparison.jsx      # Head-to-head team comparison
│   │   ├── CareerPrediction.jsx   # ScoutGPT career path prediction (F34)
│   │   ├── PlayerComparisonModal.jsx  # Side-by-side player comparison (F34)
│   │   ├── ProjectedValueChart.jsx    # 5-year market value projections (F34)
│   │   ├── Sidebar.jsx            # Navigation sidebar
│   │   └── ...                    # 20+ components
│   ├── pages/                     # Route-level page components
│   │   ├── Home.jsx               # Landing page
│   │   ├── Standings.jsx          # League table + charts
│   │   ├── ClubDetail.jsx         # Team analytics dashboard
│   │   ├── Matches.jsx            # Match listings with filters
│   │   ├── Players.jsx             # Player directory
│   │   ├── Scout.jsx               # ScoutGPT scouting dashboard
│   │   ├── SquadRisk.jsx          # Squad Fragility Index
│   │   ├── BestXI.jsx             # Team of the Season generator
│   │   ├── Archive.jsx            # Historical match archive
│   │   ├── PlayerComparison.jsx   # Statistical player comparison
│   │   └── ...                    # Other pages
│   ├── utils/                     # Utility functions
│   │   ├── RiskAnalysis.js        # Squad fragility calculations
│   │   └── valuationEngine.js     # Market value estimation (ScoutGPT)
│   ├── styles/                    # CSS modules
│   ├── App.jsx                    # Root component with routing
│   └── main.jsx                   # Application entry point
│
├── server/                        # Express.js backend
│   ├── routes/                    # API route handlers
│   │   ├── standings.js           # GET /api/standings
│   │   ├── clubs.js               # GET /api/clubs, /api/clubs/:id
│   │   ├── matches.js             # GET /api/matches, /api/matches/:id
│   │   ├── players.js             # GET /api/players
│   │   ├── analytics.js           # GET /api/analytics/club/:id
│   │   ├── ai.js                  # POST /api/llm/query (RAG endpoint)
│   │   ├── scout.js               # POST /api/scout/predict, /compare
│   │   └── search.js              # Semantic search routes
│   ├── services/                  # Business logic services
│   │   ├── aiSearchService.js     # Vector similarity search (pgvector)
│   │   ├── llmService.js          # OpenAI GPT-4 integration
│   │   └── playerScoutService.js  # Career prediction & comparison
│   └── server.js                  # Express server setup + middleware
│
├── database/                      # Database schema & migrations
│   ├── migrations/                # Incremental schema changes
│   │   ├── create_match_semantic_search_function.sql  # pgvector search function
│   │   ├── add_performance_indexes.sql                # Query optimization
│   │   └── ...                    # 8+ migrations
│   ├── schema.sql                 # Base schema (3NF normalized)
│   └── README.md                  # Database documentation
│
├── etl/                           # Data extraction, transformation, loading
│   ├── etl_script.py              # Main ETL pipeline (Python)
│   ├── requirements.txt           # Python dependencies
│   └── README.md                  # ETL documentation
│
├── public/                        # Static assets
│   └── images/                    # Team logos, icons
│
├── package.json                   # Node.js dependencies + scripts
├── vite.config.js                 # Vite build configuration
├── tailwind.config.js             # Tailwind CSS customization
├── eslint.config.js               # ESLint rules
├── vitest.config.js               # Vitest test configuration
└── README.md                      # This file
```

---

## API Endpoints Reference

### Core Data Endpoints

| Endpoint | Method | Parameters | Response | Purpose |
|----------|--------|------------|----------|---------|
| `/api/standings` | GET | None | `[{position, team_name, points, wins, draws, losses, gd, gf, ga, adjusted_points, logo_url}]` | League table with point adjustments |
| `/api/clubs` | GET | None | `[{team_id, team_name, founded_year, stadium_name, capacity, logo_url}]` | All clubs with stadium info |
| `/api/clubs/:id` | GET | `id` (UUID) | `{team_id, team_name, manager_name, captain_name, player_count, match_count, ...}` | Club details + manager + captain |
| `/api/clubs/:id/squad` | GET | `id` (UUID) | `[{player_id, player_name, position, nationality, age, jersey_number, is_captain}]` | Squad roster sorted by position |
| `/api/matches` | GET | `?matchweek=5&club=uuid&dateFrom=2023-08-01&dateTo=2024-05-19&result=win&venue=home` | `[{id, home_team, away_team, score, date, matchweek, attendance, youtube_id}]` | Filtered match listings |
| `/api/matches/:id` | GET | `id` (UUID) | `{id, home_team, away_team, score, date, matchweek, attendance, referee, youtube_id, stadium}` | Match detail with highlights |
| `/api/players` | GET | `?position=FW&club_id=uuid` | `[{id, player_name, team_name, position, nationality, age, jersey_number, ...}]` | Player directory |
| `/api/analytics/club/:id` | GET | `id` (UUID) | `[{matchweek, cumulative_points, cumulative_gf, cumulative_ga, cumulative_gd, position}]` | Time-series club analytics |

### RAG/AI Endpoints

| Endpoint | Method | Parameters | Response | Purpose |
|----------|--------|------------|----------|---------|
| `/api/llm/query` | POST | `{"query": "string", "matchCount": 5}` | `{"answer": "string", "sources": [{match_id, date}]}` | Natural language queries with citations |
| `/api/llm/match/:id/summary` | GET | `id` (UUID) | `{"summary": "string", "match_id": "uuid"}` | AI-generated match summary |
| `/api/llm/club/:id/insights` | GET | `id` (UUID) | `{"insights": ["string"], "team_name": "string"}` | Tactical analysis from analytics data |
| `/api/search/semantic` | POST | `{"query": "string", "filters": {}}` | `[{match_id, content_text, similarity, metadata}]` | Vector similarity search |

### ScoutGPT Endpoints

| Endpoint | Method | Parameters | Response | Purpose |
|----------|--------|------------|----------|---------|
| `/api/scout/predict/:id` | POST | `id` (UUID) | `{"player": {}, "ageCurve": {}, "similarPlayers": [], "marketProjections": [], "analysis": "string"}` | AI-powered career trajectory prediction |
| `/api/scout/compare` | POST | `{"playerId1": "uuid", "playerId2": "uuid", "clubContext": "string"}` | `{"player1": {}, "player2": {}, "comparison": "string"}` | Side-by-side player comparison with AI recommendation |

### Health & Utilities

| Endpoint | Method | Response | Purpose |
|----------|--------|----------|---------|
| `/health` | GET | `{"status": "ok", "database": "connected"}` | Server + database health check |

---

## Testing

### Run Test Suite

```powershell
# All tests (unit + integration)
npm test

# Interactive UI (recommended for development)
npm run test:ui

# Coverage report (target: >80%)
npm run test:coverage
```

### Test Categories

**Component Tests (`src/components/__tests__/`):**
- ✅ Aesthetic consistency (color schemes, typography)
- ✅ Animation behavior (Framer Motion)
- ✅ Interactive behaviors (click handlers, keyboard navigation)
- ✅ Responsiveness (mobile, tablet, desktop breakpoints)

**API Tests (future implementation):**
- Backend route handlers
- Database query correctness
- RAG pipeline accuracy

## Deployment

### Frontend (Vercel)

```powershell
# Install Vercel CLI
npm install -g vercel

# Deploy to production
vercel --prod
```

**Build Settings in Vercel Dashboard:**
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables:** Add `VITE_API_URL` pointing to backend URL

### Backend (Render / Railway)

**Option 1: Render.com**
1. Connect GitHub repository
2. Create new **Web Service**
3. Build Command: `npm install`
4. Start Command: `node server/server.js`
5. Add environment variables:
   - `SUPABASE_CONNECTION_STRING`
   - `OPENAI_API_KEY`
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://your-frontend.vercel.app`

**Option 2: Railway.app**
```powershell
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway up
```

**Production Checklist:**
- ✅ Enable CORS for production frontend URL
- ✅ Set `NODE_ENV=production` (disables verbose logging)
- ✅ Configure rate limiting (10 req/min for LLM endpoints)
- ✅ Enable connection pooling (already configured: max 10 connections)
- ✅ Set up monitoring (Sentry, LogRocket, or DataDog)

---

## Cost (AI / RAG)

OpenAI usage (RAG, ScoutGPT) depends on how you use the app. Set billing limits in the OpenAI dashboard and cache responses where possible to reduce cost.

---

## 🤖 ScoutGPT - AI Career Path Predictor

**ScoutGPT** is an AI-powered predictive scouting assistant that helps clubs make data-driven long-term signing decisions. It combines age-curve analysis, historical precedents, and market value projections to forecast player career trajectories.

### Features

#### 1. Career Path Prediction
- **5-Year Market Value Projections**: Visual chart showing projected value over next 5 years
- **Age-Curve Analysis**: Position-specific career phase classification (Development/Peak/Decline)
- **Historical Precedents**: Find 3 most similar players using statistical matching
- **AI-Generated Analysis**: Comprehensive career trajectory insights from GPT-4

#### 2. Player Comparison Mode
- **Side-by-Side Analysis**: Compare two players for long-term value
- **Dual Projection Charts**: Visual comparison of 5-year trajectories
- **Squad Fit Recommendations**: AI considers club context and tactical needs
- **Clear Recommendations**: Data-driven signing decisions with rationale

### How to Use

#### Quick Start
1. Navigate to **Scout** page (`/scout`)
2. Filter players using insight tags (e.g., "Golden Prospects")
3. Click **"Predict Career"** on any player card
4. View AI prediction modal with projections and insights

#### Comparison Mode
1. On Scout page, click **"Compare Mode ON"**
2. Select 2 players by clicking their cards
3. Comparison modal opens automatically
4. Optionally add club context for tailored recommendations
5. Review AI recommendation and make informed decision

### Age-Curve Models

Position-specific peak ages based on statistical analysis:
- **Goalkeepers**: Peak at 30 years
- **Defenders**: Peak at 28 years
- **Midfielders**: Peak at 27 years
- **Forwards**: Peak at 26 years

### Performance & Cost

- **Career Prediction**: 10-15 seconds
- **Player Comparison**: 15-20 seconds  
- **Similar Players Search**: <200ms
- **Cost per Prediction**: ~$0.015 (OpenAI API)
- **Cost per Comparison**: ~$0.020 (OpenAI API)

---

## 🚨 Squad Fragility Index

### Risk Assessment & Injury Impact Analysis

Evaluate your team's dependency on critical assets and understand the consequences of losing key players.

#### Features

- **🎯 Risk Analysis**: Quantify team reliance on individual players
- **📊 Visual Treemap**: See squad fragility at a glance
- **💉 Injury Simulator**: Model the impact of player unavailability
- **💰 Economic Context**: Calculate replacement costs
- **📈 Detailed Metrics**: Comprehensive statistical breakdown

#### Key Metrics

| Metric | Description | Range |
|--------|-------------|-------|
| **Reliance Score** | How much the team depends on a player | 0-100 |
| **Fragility Index** | Risk level considering backup quality | 0-100 |
| **Drop-off Delta** | Performance gap to substitute | 0-100% |
| **Replacement Cost** | Estimated transfer fee required | £0-£200M+ |

#### How to Use

1. Navigate to **Squad Risk** in the sidebar
2. Select a Premier League team
3. Review the treemap visualization:
   - **Box size** = Player importance
   - **Box color** = Risk level (🟢 Low → 🔴 Critical)
4. Toggle the **Injury Simulator** to model scenarios
5. View detailed statistics in the risk analysis table

#### Risk Levels

- 🟢 **Low (0-20)**: Well-covered position, minimal risk
- 🟡 **Medium (20-40)**: Consider adding depth
- 🟠 **High (40-60)**: Priority for backup signing
- 🔴 **Critical (60+)**: Urgent action required

#### Calculations

```javascript
// Reliance Score
relianceScore = (minutesPlayed / totalMinutes) × performancePercentile × 100

// Fragility Index  
fragilityIndex = relianceScore × dropOffDelta

// Replacement Cost
replacementCost = marketValue × 1.4
```

#### Performance

- ⚡ Initial load: < 2 seconds
- ⚡ Risk calculation: < 100ms for 25 players
- ⚡ Treemap render: < 500ms
- ⚡ Smooth 60fps animations

---

## Documentation

- **[Backend API Documentation](server/README.md)** - Complete endpoint reference with examples
- **[Database Schema & Migrations](database/README.md)** - Table structures, views, indexes
- **[ETL Pipeline Guide](etl/README.md)** - Data ingestion process, normalization algorithms

---


## Troubleshooting

### Common Issues (Windows)

**Issue:** `npm install` fails with `gyp ERR!`

**Solution:**
```powershell
# Install Windows Build Tools
npm install --global windows-build-tools

# Retry installation
npm install
```

---

**Issue:** Port 5000 already in use

**Solution:**
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (replace <PID> with actual ID)
taskkill /PID <PID> /F

# Or change PORT in .env
PORT=5001
```

---

**Issue:** `CREATE EXTENSION vector` fails in Supabase

**Solution:**
- Supabase fully supports `pgvector`—this should never fail
- Verify you're running SQL in the correct project
- Check Supabase status page for service interruptions

---

**Issue:** OpenAI API rate limit exceeded

**Solution:** Reduce request frequency (e.g. smaller batch sizes, delays between calls) or add backoff/retry in your API client.

---

**Issue:** Frontend not loading data (CORS errors)

**Solution:**
```javascript
// server/server.js - Verify CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

---

## License

Apache License, Version 2.0

---

## Authors

**Harrison Nguyen, Nam Nguyen**

For academic collaboration inquiries or technical questions about adapting this framework for historical text analysis:
- **Email:** [your-academic-email@university.edu]
- **GitHub:** [github.com/your-username/football-api](https://github.com/your-username/football-api)
- **LinkedIn:** [linkedin.com/in/your-profile](https://linkedin.com/in/your-profile)

---

## Acknowledgments

- **Data Sources:** Premier League official statistics (demonstration corpus)
- **Technologies:** OpenAI (GPT-4, text-embedding-3-small), PostgreSQL pgvector, React, Supabase
---

<div align="center">

**© 2024 Premier League Analytics**

*"Every match is a document. Every goal, a data point."*

</div>
