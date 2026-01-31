# LLM Integration System Design Document
## Premier League Analytics Hub - Production-Grade LLM Architecture

**Document Version:** 1.0  
**Date:** 2024  
**Author:** Principal AI Systems Architect  
**Status:** Architectural Design (No Code Implementation)

---

## Executive Summary

This document provides an exhaustive, file-by-file analysis of the Premier League Analytics Hub codebase and designs a production-grade LLM integration strategy. The analysis covers the React frontend, Express backend, PostgreSQL/Supabase database schema, and Python ETL scripts to identify high-value LLM insertion points while avoiding inappropriate use cases.

**Key Findings:**
- **High-Value LLM Opportunities:** Natural language querying, automated performance insights, tactical summaries, match commentary generation
- **Inappropriate LLM Usage:** Deterministic calculations (standings, goal differences), real-time score updates, data validation
- **Recommended Architecture:** Backend inference with RAG (Retrieval-Augmented Generation), context injection from database, streaming responses for UX

---

## 1. Current System Overview

### 1.1 Architecture

**Technology Stack:**
- **Frontend:** React 19, Vite, React Router DOM 7, Framer Motion, Chart.js, Recharts, Tailwind CSS
- **Backend:** Node.js, Express.js 4.x, PostgreSQL (Supabase), pg connection pooling
- **ETL:** Python 3.8+, pandas, SQLAlchemy, RapidFuzz
- **Database:** PostgreSQL (Supabase) with 3NF schema, UUID primary keys, window functions

**System Flow:**
```
User Request → React Frontend (Port 5173)
    ↓
Vite Proxy (/api/*)
    ↓
Express Backend (Port 5000)
    ↓
PostgreSQL Connection Pool (max 10 connections)
    ↓
Supabase PostgreSQL Database
    ↓
Response → JSON API → Frontend Rendering
```

### 1.2 Data Ownership & Schema

**Core Tables:**
- `stadiums` (id, stadium_name, city, capacity)
- `team` (team_id, team_name, stadium_id, founded_year, logo_url, captain_id)
- `players` (id, team_id, player_name, position, nationality, age, jersey_number)
- `matches` (id, home_team_id, away_team_id, date, home_team_score, away_team_score, matchweek, attendance, referee, youtube_id)
- `point_adjustments` (id, team_id, adjustment, season, reason)
- `managers` (id, manager_name, nationality)
- `managing` (id, manager_id, team_id, season_start, season_end)

**Views:**
- `league_standings` - Dynamic calculation from matches (Points → GD → GF tie-breakers)
- `club_analytics_timeseries` - Window functions for cumulative stats, position ranking by matchweek

**Data Flow:**
1. **ETL Pipeline:** CSV/XLSX → Python ETL Script → PostgreSQL (batch processing, 500 rows/transaction)
2. **API Layer:** Express routes query database → JSON responses
3. **Frontend:** React components fetch API → render charts/tables

### 1.3 Current UX Flows

**Primary User Journeys:**

1. **Standings Page (`/standings`):**
   - Fetches `/api/standings` (includes point adjustments)
   - Fetches `/api/matches` (for form guide calculation)
   - Displays sortable table with form badges (last 5 matches)
   - Interactive charts: Cumulative Points, Attack/Defense scatterplot, Goal Difference
   - Filter by venue (Home/Away), gameweek range, selected teams

2. **Matches Page (`/matches`):**
   - Fetches `/api/matches` (supports gameweek, club, date, result, venue filters)
   - Displays match cards with YouTube highlights (LitePlayer component)
   - Sort by date, goals, attendance
   - Club filter dropdown

3. **Clubs Page (`/clubs`):**
   - Fetches `/api/clubs` (list all teams with stadium info)
   - Grid view with team logos, founded year, stadium capacity
   - Links to club detail pages

4. **Club Detail Page (`/teams/:id`):**
   - Fetches `/api/clubs/:id` (team metadata, manager, captain)
   - Fetches `/api/clubs/:id/squad` (players with position, nationality, captain flag)
   - Fetches `/api/matches` (filters for team matches)
   - Fetches `/api/analytics/club/:id` (timeseries: cumulative points, GD, GF, GA, position by matchweek)
   - Performance dashboard: league position, goals, biggest win, heaviest defeat, attendance records
   - Form guide (last 10 matches with tooltips)
   - Charts: Goals (GF/GA bar), Season Path (scatter with bisector), Position Progression (line), Results by Venue (clustered bar), Overall Results (pie)
   - Squad table with filters (name, nationality, position, captain)

5. **Players Page (`/players`):**
   - Fetches `/api/players` (all players with optional position/club_id filters)
   - Fetches `/api/clubs` (for club filter dropdown)
   - Search/filter by name, nationality, position, club, captain status
   - Sortable table (desktop) / cards (mobile)

**Data Processing Patterns:**
- **Client-Side Aggregation:** Form guide calculation in `Standings.jsx` (last 5 matches per team)
- **Server-Side Aggregation:** Standings view uses SQL CTEs, analytics view uses window functions
- **Memoization:** React `useMemo` for expensive calculations (form data, filtered lists)
- **Lazy Loading:** React `lazy()` for code splitting, Suspense for loading states

### 1.4 Current API Endpoints

**Backend Routes (`server/routes/`):**

1. **`standings.js`:** `GET /api/standings`
   - Joins `league_standings` view with `point_adjustments` table
   - Returns adjusted points, logo URLs (fallback to UI-Avatars)
   - Performance target: <200ms

2. **`clubs.js`:** 
   - `GET /api/clubs` - List all teams with stadium info
   - `GET /api/clubs/:id` - Team details (with manager, captain, player/match counts)
   - `GET /api/clubs/:id/squad` - Players for team (sorted by position)
   - `GET /api/clubs/:id/stats` - Match-by-match stats with running totals, form string

3. **`matches.js`:**
   - `GET /api/matches` - All matches (filters: gameweek, club, dateFrom, dateTo, result, venue, aggregate)
   - `GET /api/matches/:id` - Match details with YouTube ID
   - Pre-calculates result_type, total_goals, goal_difference for aggregation

4. **`players.js`:** `GET /api/players`
   - Filters: position, club_id
   - Returns player with team info, is_captain flag
   - Fallback query if captain_id column missing

5. **`analytics.js`:** `GET /api/analytics/club/:id`
   - Queries `club_analytics_timeseries` view
   - Returns matchweek-by-matchweek performance with cumulative stats, position

**Health Check:** `GET /health` - Database connection status

### 1.5 ETL Pipeline

**File:** `etl/etl_script.py`

**Process Flow:**
1. Connect to PostgreSQL (connection pooling: pool_size=5, max_overflow=10)
2. Load stadiums from `stadium.xlsx` (batch: 500 rows/transaction)
3. Load teams from `team.csv` (fuzzy match stadium names)
4. Load players from `players.csv` (normalize team names, positions)
5. Load matches from `matches.csv` (calculate matchweek, extract YouTube ID, clean attendance)
6. Verify insertion (row counts)

**Key Features:**
- Team name normalization (exact mapping + fuzzy matching with RapidFuzz, 80% threshold)
- Position normalization (GK → Goalkeeper, etc.)
- YouTube ID extraction (11 characters from full URLs)
- Attendance parsing (removes commas: "21,572" → 21572)
- Matchweek calculation (days since season start / 7)
- Duplicate prevention (checks existing records before insert)
- Data validation (2023/24 season date range, goal ranges 0-10, attendance 0-100000)

---

## 2. LLM Opportunity Map

### 2.1 File-Level Analysis

#### **Frontend Components (`src/components/`)**

| File | Current Function | LLM Opportunity | Priority | Rationale |
|------|-----------------|-----------------|----------|------------|
| `DataInsights.jsx` | Static tips/guidance | **Dynamic insights generation** | HIGH | Replace static tips with LLM-generated contextual insights based on current data |
| `MatchDetail.jsx` | Match info display | **Match commentary generation** | MEDIUM | Generate narrative summaries of matches |
| `TeamStats.jsx` | Statistical displays | **Performance analysis** | HIGH | LLM-generated tactical analysis from stats |
| `StatsSummary.jsx` | Aggregate stats | **Natural language summaries** | MEDIUM | Convert numbers to readable insights |

#### **Frontend Pages (`src/pages/`)**

| File | Current Function | LLM Opportunity | Priority | Rationale |
|------|-----------------|-----------------|----------|------------|
| `Home.jsx` | Landing page | **Personalized recommendations** | LOW | LLM could suggest teams/matches based on user behavior (future) |
| `Standings.jsx` | League table | **Natural language queries** | HIGH | "Why is Manchester City in 1st place?" → LLM analyzes points, GD, form |
| `Matches.jsx` | Match listings | **Match previews/predictions** | MEDIUM | Generate match previews, highlight key storylines |
| `Clubs.jsx` | Club grid | **Club comparisons** | MEDIUM | "Compare Arsenal vs Chelsea" → LLM generates comparison |
| `ClubDetail.jsx` | Team dashboard | **Tactical analysis, season narratives** | HIGH | Generate match-by-match narratives, tactical insights from charts |
| `Players.jsx` | Player directory | **Player comparisons, career insights** | MEDIUM | "Compare Salah vs Haaland" → LLM analyzes stats, playing styles |

#### **Backend Routes (`server/routes/`)**

| File | Current Function | LLM Opportunity | Priority | Rationale |
|------|-----------------|-----------------|----------|------------|
| `standings.js` | Standings calculation | **Natural language explanations** | HIGH | "Explain why Everton is 18th" → LLM explains point deduction, form |
| `clubs.js` | Club data retrieval | **Club summaries, history** | MEDIUM | Generate club background, season narratives |
| `matches.js` | Match data retrieval | **Match summaries, key moments** | HIGH | Generate match reports, highlight key events |
| `players.js` | Player data retrieval | **Player profiles, comparisons** | MEDIUM | Generate player bios, playing style analysis |
| `analytics.js` | Timeseries data | **Trend analysis, predictions** | HIGH | "What's Arsenal's trajectory?" → LLM analyzes position progression |

#### **Database Schema (`database/`)**

| Component | Current Function | LLM Opportunity | Priority | Rationale |
|-----------|-----------------|-----------------|----------|------------|
| `league_standings` view | Dynamic calculation | **N/A (Deterministic)** | NONE | LLM should NOT calculate standings (deterministic math) |
| `club_analytics_timeseries` view | Cumulative stats | **Trend interpretation** | HIGH | LLM interprets trends, identifies patterns |
| `matches` table | Match records | **Context for RAG** | HIGH | Primary data source for match-related LLM queries |
| `players` table | Player records | **Context for RAG** | MEDIUM | Player comparison queries |
| `team` table | Team metadata | **Context for RAG** | MEDIUM | Club history, manager info |

#### **ETL Script (`etl/etl_script.py`)**

| Function | Current Function | LLM Opportunity | Priority | Rationale |
|----------|-----------------|-----------------|----------|------------|
| `normalize_team_name()` | Fuzzy matching | **N/A (Deterministic)** | NONE | Keep deterministic fuzzy matching |
| `validate_2023_24_season()` | Data validation | **N/A (Deterministic)** | NONE | Keep deterministic validation |
| Data loading | Batch inserts | **Data quality insights** | LOW | LLM could analyze data quality issues (future) |

### 2.2 Feature-Level LLM Insertion Points

#### **HIGH-VALUE OPPORTUNITIES**

1. **Natural Language Query Interface**
   - **Location:** New route `server/routes/llm.js`, new component `src/components/NaturalLanguageQuery.jsx`
   - **Use Case:** "Show me teams that scored more than 80 goals" → LLM parses intent → SQL query → Results
   - **Value:** Democratizes data access, no SQL knowledge required
   - **Example Queries:**
     - "Why did Manchester City win the league?"
     - "Which team has the best home record?"
     - "Compare Erling Haaland and Mohamed Salah's goal contributions"
     - "What was Arsenal's worst matchweek?"

2. **Automated Performance Insights**
   - **Location:** Enhance `ClubDetail.jsx`, add `src/components/LLMInsights.jsx`
   - **Use Case:** Generate tactical analysis from cumulative stats, position trends
   - **Value:** Transforms raw numbers into actionable insights
   - **Example Outputs:**
     - "Arsenal's position dropped from 2nd to 5th between matchweeks 15-20 due to a 3-match losing streak, conceding 8 goals while scoring only 2."
     - "Manchester City's attack efficiency improved in the second half of the season, averaging 2.8 goals per match compared to 2.1 in the first half."

3. **Match Commentary & Summaries**
   - **Location:** New route `GET /api/matches/:id/summary`, enhance `MatchDetail.jsx`
   - **Use Case:** Generate narrative match reports from score, attendance, YouTube highlights context
   - **Value:** Enhances match detail pages with human-readable stories
   - **Example Output:**
     - "A thrilling encounter at Old Trafford saw Manchester United edge Liverpool 2-1 in front of 73,000 fans. The home side took an early lead, but Liverpool equalized before half-time. A late winner secured all three points for United, moving them into the top four."

4. **Tactical Summaries**
   - **Location:** Enhance `ClubDetail.jsx` analytics section
   - **Use Case:** Interpret scatter plots (Attack vs Defense), position progression charts
   - **Value:** Makes complex visualizations accessible
   - **Example Output:**
     - "Arsenal's season path shows a strong attacking focus (cumulative GF: 88) but defensive vulnerabilities (cumulative GA: 62), placing them in the 'Attacking Dominance' quadrant. Their position improved from 8th to 2nd after matchweek 20, coinciding with a 12-match unbeaten run."

5. **Season Narratives**
   - **Location:** New component `src/components/SeasonNarrative.jsx`, new route `GET /api/analytics/club/:id/narrative`
   - **Use Case:** Generate season-long story arcs from timeseries data
   - **Value:** Creates engaging content for club detail pages
   - **Example Output:**
     - "Arsenal's 2023/24 season was a tale of two halves. A strong start saw them challenge for the title, but a mid-season slump dropped them to 5th. A late resurgence, including wins over Manchester City and Liverpool, secured Champions League qualification."

#### **MEDIUM-VALUE OPPORTUNITIES**

6. **Player Comparisons**
   - **Location:** Enhance `Players.jsx`, new route `GET /api/players/compare`
   - **Use Case:** "Compare Mohamed Salah and Erling Haaland"
   - **Value:** Helps users understand player strengths/weaknesses

7. **Match Previews**
   - **Location:** Enhance `Matches.jsx`, new route `GET /api/matches/preview`
   - **Use Case:** Generate previews for upcoming matches based on form, head-to-head
   - **Value:** Adds context to match listings

8. **Club History Summaries**
   - **Location:** Enhance `ClubDetail.jsx` header section
   - **Use Case:** Generate club background from founded_year, manager, recent performance
   - **Value:** Provides context for new users

#### **LOW-VALUE / INAPPROPRIATE USE CASES**

❌ **DO NOT USE LLM FOR:**
- **Standings Calculations:** Deterministic math (Points = 3×W + 1×D, sorted by GD, GF)
- **Real-Time Score Updates:** Requires deterministic data, not generative
- **Data Validation:** ETL script validation is rule-based, not LLM-appropriate
- **SQL Query Generation (Critical Paths):** Use LLM for user queries, but not for core API endpoints (latency, reliability)
- **Logo URL Generation:** Deterministic fallback logic (UI-Avatars)
- **Form Guide Calculation:** Simple W/D/L mapping from match results

---

## 3. Recommended LLM Architecture

### 3.1 Inference Location: Backend

**Decision: Backend Inference (Express.js)**

**Rationale:**
- **Security:** API keys stay server-side, not exposed to frontend
- **Cost Control:** Centralized rate limiting, token usage tracking
- **Latency:** Backend can cache responses, batch requests
- **Context Management:** Easier to inject database records (RAG) on server
- **Error Handling:** Centralized error handling, retry logic

**Alternative Considered: Edge (Vercel Edge Functions)**
- **Rejected:** Limited database connection capabilities, harder RAG integration

### 3.2 RAG vs Fine-Tuning

**Decision: RAG (Retrieval-Augmented Generation) with Pre-Computed Embeddings**

**Architecture:**
```
User Query → Express Route → LLM Service
    ↓
Parse Intent (LLM or Rule-Based)
    ↓
Retrieve Relevant Context (PostgreSQL + Vector Search)
    ↓
Inject Context into Prompt
    ↓
LLM Inference (OpenAI GPT-4 / Anthropic Claude)
    ↓
Post-Process Response (Format, Validate)
    ↓
Return to Frontend (Streaming or Non-Streaming)
```

**Why RAG over Fine-Tuning:**
- **Data Freshness:** Premier League data changes weekly; fine-tuning requires retraining
- **Cost:** Fine-tuning expensive ($0.008/1K tokens training), RAG uses base models
- **Flexibility:** RAG allows dynamic context injection per query
- **Accuracy:** RAG can cite specific matches, players, dates (reduces hallucinations)

**Vector Store Strategy:**
- **Option 1:** PostgreSQL with `pgvector` extension (Supabase supports this)
  - Embeddings stored in `match_embeddings`, `player_embeddings`, `team_embeddings` tables
  - Query: `SELECT * FROM match_embeddings ORDER BY embedding <-> query_embedding LIMIT 5`
- **Option 2:** Supabase Vector (if available)
- **Option 3:** External vector DB (Pinecone, Weaviate) - **Rejected** (adds complexity, cost)

**Embedding Model:**
- **OpenAI `text-embedding-3-small`** (1536 dimensions, $0.02/1M tokens)
- **Alternative:** `text-embedding-3-large` (3072 dimensions) if higher accuracy needed

### 3.3 Context Window Management

**Strategy: Hierarchical Context Injection**

**Tier 1: Critical Context (Always Included)**
- Current query parameters (team_id, matchweek, date range)
- User's current page context (Standings, Club Detail, etc.)

**Tier 2: Relevant Records (Retrieved via RAG)**
- Top 5 most relevant matches (via vector similarity)
- Top 3 most relevant players (if player query)
- Team metadata (if team query)

**Tier 3: Summary Statistics (Pre-Computed)**
- Team form (last 5 matches: W/D/L)
- League position, points, GD
- Season aggregates (total goals, wins, etc.)

**Context Window Limits:**
- **GPT-4 Turbo:** 128K tokens
- **Claude 3.5 Sonnet:** 200K tokens
- **Strategy:** Keep context under 10K tokens per query (allows 10+ queries per window)

**Context Compression:**
- Use LLM to summarize large datasets before injection
- Example: Instead of 38 matchweek records, inject: "Arsenal: Started 8th, peaked at 2nd (MW 20), finished 5th. Key dip: MW 15-20 (3 losses)."

### 3.4 Execution Environment

**Backend Service Architecture:**

```
Express Server (server/server.js)
    ↓
LLM Service Module (server/services/llmService.js)
    ├── OpenAI Client (openai npm package)
    ├── Embedding Service (text-embedding-3-small)
    ├── Vector Search (PostgreSQL pgvector)
    └── Response Cache (Redis or in-memory)
    ↓
LLM Routes (server/routes/llm.js)
    ├── POST /api/llm/query (Natural language queries)
    ├── GET /api/llm/match/:id/summary (Match summaries)
    ├── GET /api/llm/club/:id/insights (Club insights)
    └── GET /api/llm/analytics/:id/narrative (Season narratives)
```

**Dependencies to Add:**
```json
{
  "openai": "^4.20.0",
  "redis": "^4.6.0",  // Optional: for caching
  "pgvector": "^0.1.8"  // PostgreSQL vector extension
}
```

**Environment Variables:**
```env
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4-turbo-preview  # or claude-3-5-sonnet-20241022
LLM_TEMPERATURE=0.3  # Lower for factual queries
LLM_MAX_TOKENS=1000
VECTOR_DB_ENABLED=true
CACHE_TTL_SECONDS=3600  # 1 hour cache for similar queries
```

---

## 4. Step-by-Step Implementation Plan

### Phase 1: Foundation (Week 1-2)

**Step 1.1: Database Vector Extension Setup**
- **File:** `database/migrations/add_vector_extension.sql`
- **Action:** Enable `pgvector` extension in Supabase
- **SQL:**
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- **Dependencies:** None
- **Verification:** `SELECT * FROM pg_extension WHERE extname = 'vector';`

**Step 1.2: Embedding Tables Creation**
- **File:** `database/migrations/create_embedding_tables.sql`
- **Action:** Create tables for storing embeddings
- **Tables:**
  - `match_embeddings` (match_id UUID, embedding vector(1536), metadata JSONB)
  - `player_embeddings` (player_id UUID, embedding vector(1536), metadata JSONB)
  - `team_embeddings` (team_id UUID, embedding vector(1536), metadata JSONB)
- **Indexes:** HNSW index on embedding columns for fast similarity search
- **Dependencies:** Step 1.1
- **Verification:** Insert test embedding, query similarity

**Step 1.3: LLM Service Module**
- **File:** `server/services/llmService.js`
- **Action:** Create LLM service with OpenAI client, embedding generation, vector search
- **Functions:**
  - `generateEmbedding(text)` - Calls OpenAI embedding API
  - `searchSimilarMatches(query, limit)` - Vector search in PostgreSQL
  - `generateResponse(prompt, context)` - Calls OpenAI chat completion
  - `cacheResponse(key, response, ttl)` - Response caching
- **Dependencies:** `openai` npm package, database connection pool
- **Verification:** Unit tests for each function

**Step 1.4: Embedding Generation Script**
- **File:** `scripts/generate_embeddings.js` (or Python: `scripts/generate_embeddings.py`)
- **Action:** One-time script to generate embeddings for existing data
- **Process:**
  1. Query all matches, players, teams from database
  2. Generate text representations (e.g., "Manchester United 2-1 Liverpool, Matchweek 15, 73,000 attendance")
  3. Call embedding API (batch requests for efficiency)
  4. Store embeddings in embedding tables
- **Dependencies:** Step 1.2, Step 1.3
- **Verification:** Check embedding counts match source data

### Phase 2: Core LLM Routes (Week 3-4)

**Step 2.1: Natural Language Query Endpoint**
- **File:** `server/routes/llm.js` (new route: `POST /api/llm/query`)
- **Action:** Accept natural language queries, parse intent, retrieve context, generate response
- **Flow:**
  1. Receive query: `{ "query": "Why is Manchester City in 1st place?" }`
  2. Parse intent (rule-based or LLM): Extract team name, question type
  3. Retrieve context: Vector search for relevant matches, fetch standings data
  4. Build prompt with context
  5. Call LLM service
  6. Return response: `{ "answer": "...", "sources": [...] }`
- **Dependencies:** Step 1.3
- **Verification:** Test with sample queries

**Step 2.2: Match Summary Endpoint**
- **File:** `server/routes/llm.js` (new route: `GET /api/llm/match/:id/summary`)
- **Action:** Generate narrative match summary from match data
- **Context Injection:**
  - Match record (teams, score, date, attendance, referee)
  - Team form (last 5 matches for both teams)
  - League positions at time of match
  - YouTube highlights context (if available)
- **Dependencies:** Step 1.3, existing `matches.js` route
- **Verification:** Generate summaries for sample matches, validate accuracy

**Step 2.3: Club Insights Endpoint**
- **File:** `server/routes/llm.js` (new route: `GET /api/llm/club/:id/insights`)
- **Action:** Generate tactical insights from club analytics data
- **Context Injection:**
  - `club_analytics_timeseries` data (position progression, cumulative stats)
  - Recent matches (last 10)
  - Form guide (W/D/L string)
  - Comparison to league averages
- **Dependencies:** Step 1.3, existing `analytics.js` route
- **Verification:** Generate insights for multiple clubs, check for hallucinations

**Step 2.4: Season Narrative Endpoint**
- **File:** `server/routes/llm.js` (new route: `GET /api/llm/analytics/:id/narrative`)
- **Action:** Generate season-long narrative from timeseries data
- **Context Injection:**
  - Full `club_analytics_timeseries` (38 matchweeks)
  - Key moments (biggest win, heaviest defeat, position changes)
  - Comparison to previous seasons (if available)
- **Dependencies:** Step 1.3, existing `analytics.js` route
- **Verification:** Generate narratives, ensure chronological accuracy

### Phase 3: Frontend Integration (Week 5-6)

**Step 3.1: Natural Language Query Component**
- **File:** `src/components/NaturalLanguageQuery.jsx`
- **Action:** Chat-like interface for natural language queries
- **Features:**
  - Text input with send button
  - Streaming response display (if streaming enabled)
  - Source citations (links to matches/players mentioned)
  - Query history (localStorage)
- **Dependencies:** Step 2.1
- **Verification:** Test query flow, error handling

**Step 3.2: Match Summary Integration**
- **File:** `src/components/MatchDetail.jsx` (enhance existing)
- **Action:** Add "AI Summary" section that fetches from `/api/llm/match/:id/summary`
- **Features:**
  - Loading state while generating
  - Collapsible section (default collapsed to save tokens)
  - Regenerate button
- **Dependencies:** Step 2.2
- **Verification:** Display summaries for various matches

**Step 3.3: Club Insights Integration**
- **File:** `src/pages/ClubDetail.jsx` (enhance existing)
- **Action:** Add "AI Insights" card in Performance Dashboard section
- **Features:**
  - Fetches from `/api/llm/club/:id/insights`
  - Displays alongside charts
  - Refresh button
- **Dependencies:** Step 2.3
- **Verification:** Insights appear for all clubs, update on data changes

**Step 3.4: Season Narrative Integration**
- **File:** `src/pages/ClubDetail.jsx` (new section)
- **Action:** Add "Season Story" section with narrative from `/api/llm/analytics/:id/narrative`
- **Features:**
  - Full-page section with narrative text
  - Highlighted key moments (biggest win, position changes)
  - Timeline visualization (optional)
- **Dependencies:** Step 2.4
- **Verification:** Narratives are accurate, engaging

### Phase 4: Optimization & Guardrails (Week 7-8)

**Step 4.1: Response Caching**
- **File:** `server/services/llmService.js` (enhance)
- **Action:** Implement Redis or in-memory cache for LLM responses
- **Strategy:**
  - Cache key: `hash(query + context_hash)`
  - TTL: 1 hour for match summaries, 6 hours for club insights
  - Invalidate on data updates (new matches, standings changes)
- **Dependencies:** `redis` npm package (optional, can use in-memory Map)
- **Verification:** Cache hits reduce API calls, responses are fresh

**Step 4.2: Rate Limiting**
- **File:** `server/middleware/rateLimiter.js` (new)
- **Action:** Implement rate limiting for LLM endpoints
- **Limits:**
  - 10 queries per user per minute (natural language queries)
  - 100 requests per hour per IP (all LLM endpoints)
- **Dependencies:** `express-rate-limit` npm package
- **Verification:** Rate limits enforced, appropriate error messages

**Step 4.3: Cost Tracking**
- **File:** `server/services/llmService.js` (enhance)
- **Action:** Log token usage, cost per request
- **Metrics:**
  - Input tokens, output tokens per request
  - Cost per request (track in database or logs)
  - Daily/monthly cost summaries
- **Dependencies:** None (use OpenAI usage API or manual calculation)
- **Verification:** Cost logs accurate, alerts on budget thresholds

**Step 4.4: Error Handling & Fallbacks**
- **File:** `server/routes/llm.js` (enhance)
- **Action:** Graceful degradation when LLM fails
- **Fallbacks:**
  - LLM timeout → Return cached response or error message
  - API key invalid → Log error, return 503
  - Rate limit exceeded → Return 429 with retry-after header
  - Invalid query → Return 400 with suggestions
- **Dependencies:** None
- **Verification:** All error cases handled, user-friendly messages

**Step 4.5: PII Scrubbing**
- **File:** `server/services/llmService.js` (enhance)
- **Action:** Remove PII from prompts before sending to LLM
- **Scrubbing:**
  - Remove email addresses, phone numbers (if any in data)
  - Anonymize referee names (optional, may want to keep)
  - No player personal info beyond public stats (age, nationality OK)
- **Dependencies:** None (regex patterns)
- **Verification:** PII removed from logs, prompts

### Phase 5: Testing & Monitoring (Week 9-10)

**Step 5.1: Unit Tests**
- **Files:** `server/services/__tests__/llmService.test.js`, `server/routes/__tests__/llm.test.js`
- **Action:** Test LLM service functions, route handlers
- **Coverage:**
  - Embedding generation
  - Vector search
  - Response generation
  - Error handling
- **Dependencies:** `vitest`, `@testing-library`
- **Verification:** >80% code coverage

**Step 5.2: Integration Tests**
- **File:** `tests/integration/llm.test.js`
- **Action:** Test end-to-end LLM flows
- **Scenarios:**
  - Natural language query → Response
  - Match summary generation
  - Club insights generation
  - Error cases (invalid query, API failure)
- **Dependencies:** Test database, mock OpenAI API (or use test API key)
- **Verification:** All scenarios pass

**Step 5.3: Performance Monitoring**
- **File:** `server/middleware/llmMetrics.js` (new)
- **Action:** Track LLM request metrics
- **Metrics:**
  - Response time (p50, p95, p99)
  - Token usage (input, output, total)
  - Cache hit rate
  - Error rate
- **Dependencies:** Logging service (Winston, Pino) or APM (DataDog, New Relic)
- **Verification:** Metrics logged, dashboards created

**Step 5.4: User Acceptance Testing**
- **Action:** Test with real users, gather feedback
- **Focus Areas:**
  - Response accuracy (hallucination rate)
  - Response relevance (does it answer the question?)
  - Response speed (acceptable latency?)
  - UX (is the interface intuitive?)
- **Dependencies:** None
- **Verification:** Positive feedback, low hallucination rate (<5%)

---

## 5. Prompt Design Strategy

### 5.1 System Prompts

**Base System Prompt (All LLM Calls):**
```
You are an expert Premier League analyst with access to the 2023/24 season data. 
Your role is to provide accurate, insightful analysis based on the data provided.

Rules:
1. Only use information provided in the context. Do not make up facts.
2. If you don't know something, say "I don't have that information."
3. Cite specific matches, dates, or statistics when making claims.
4. Be concise but thorough.
5. Use natural, engaging language suitable for football fans.
6. Avoid speculation about future events (this is historical data).
```

**Domain-Specific System Prompts:**

**Match Summary Prompt:**
```
You are a Premier League match commentator. Generate a narrative summary of the match 
based on the provided data. Include:
- Key moments (goals, significant events)
- Context (team form, league positions)
- Match significance (impact on standings, records)
- Engaging storytelling while staying factual.
```

**Club Insights Prompt:**
```
You are a tactical analyst. Analyze the provided club performance data and generate 
insights about:
- Performance trends (improvements, declines)
- Tactical patterns (attack vs defense balance)
- Key turning points in the season
- Comparison to league averages
Be specific with matchweeks, statistics, and dates.
```

**Natural Language Query Prompt:**
```
You are a Premier League data assistant. Answer user questions based on the provided 
database context. 

If the question requires data not in the context, explain what data would be needed.
If the question is ambiguous, ask for clarification.
Always cite your sources (match IDs, player names, dates).
```

### 5.2 User Prompt Templates

**Match Summary Template:**
```
Generate a match summary for:
- Home Team: {home_team_name}
- Away Team: {away_team_name}
- Score: {home_score} - {away_score}
- Date: {date}
- Attendance: {attendance}
- Matchweek: {matchweek}
- Home Team Form (Last 5): {home_form}
- Away Team Form (Last 5): {away_form}
- Home Team Position: {home_position}
- Away Team Position: {away_position}

Context from similar matches:
{similar_matches_context}

Generate a 3-4 sentence narrative summary.
```

**Club Insights Template:**
```
Analyze the following club performance data:

Team: {team_name}
Current Position: {position}
Points: {points} (Goal Difference: {gd})

Recent Form (Last 10 Matches): {form_string}

Position Progression:
{matchweek_position_data}

Key Statistics:
- Goals For: {gf}
- Goals Against: {ga}
- Biggest Win: {biggest_win}
- Heaviest Defeat: {heaviest_defeat}

Generate 3-5 insights about this team's season performance.
```

**Natural Language Query Template:**
```
User Question: {user_query}

Relevant Context from Database:
- Standings: {standings_context}
- Matches: {matches_context}
- Players: {players_context}
- Teams: {teams_context}

Answer the user's question using only the provided context. 
If the question cannot be answered with the provided context, explain what information is missing.
```

### 5.3 Few-Shot Examples

**Match Summary Examples:**

**Example 1 (High-Scoring Match):**
```
Input: Manchester City 4-1 Liverpool, Matchweek 10, 53,400 attendance
Output: "A dominant display from Manchester City saw them thrash Liverpool 4-1 at the Etihad Stadium in front of 53,400 fans. The home side took control early, scoring twice in the first half, and continued their dominance after the break. Liverpool's consolation goal came too late to affect the outcome, as City's attacking prowess proved too much for the visitors."
```

**Example 2 (Close Match):**
```
Input: Arsenal 2-1 Tottenham, Matchweek 15, 60,000 attendance
Output: "A tightly contested North London derby ended with Arsenal edging Tottenham 2-1 at the Emirates. Both teams created chances in an end-to-end encounter, but Arsenal's clinical finishing proved decisive. The result had significant implications for the top-four race, with Arsenal moving into second place."
```

**Club Insights Examples:**

**Example 1 (Strong Season):**
```
Input: Manchester City, Position: 1st, Points: 89, Form: WWWDW
Output: "Manchester City's title-winning campaign was built on consistency and attacking excellence. They maintained top spot for most of the season, with a particularly strong finish (4 wins in last 5 matches). Their goal difference of +58 reflects both their potent attack and solid defense."
```

**Example 2 (Inconsistent Season):**
```
Input: Chelsea, Position: 6th, Points: 63, Form: LWDWL
Output: "Chelsea's season was marked by inconsistency, with their position fluctuating between 4th and 8th. A mid-season slump saw them drop points against lower-ranked teams, but a late resurgence secured European qualification. Their defensive record (33 goals conceded) was among the best in the league."
```

### 5.4 Context-Injection Patterns

**Pattern 1: Hierarchical Context (Most Relevant First)**
```
1. Direct Answer Data (e.g., team standings for "Why is X in 1st?")
2. Supporting Context (e.g., recent matches, form)
3. Comparative Context (e.g., league averages, other teams)
```

**Pattern 2: Temporal Context (Chronological)**
```
For season narratives:
1. Early Season (Matchweeks 1-10)
2. Mid-Season (Matchweeks 11-25)
3. Late Season (Matchweeks 26-38)
```

**Pattern 3: Statistical Context (Aggregates + Details)**
```
1. Summary Statistics (totals, averages)
2. Key Moments (biggest win, worst defeat)
3. Trend Data (position progression, form guide)
```

**Context Compression Example:**
Instead of:
```
Matchweek 1: Position 8, Points 0, GD 0
Matchweek 2: Position 7, Points 3, GD +1
Matchweek 3: Position 6, Points 6, GD +2
... (35 more rows)
```

Use:
```
Arsenal started in 8th position and gradually climbed to 2nd by matchweek 20, 
peaking at 1st in matchweek 25. A mid-season dip (matchweeks 15-20) saw them 
drop to 5th, but they recovered to finish 2nd. Key turning points: 
- Matchweek 10: Moved into top 4
- Matchweek 20: Reached 2nd place
- Matchweek 30: Secured Champions League qualification
```

---

## 6. Backend Integration Plan

### 6.1 API Boundaries

**New LLM Endpoints (Add to `server/routes/llm.js`):**

```javascript
// POST /api/llm/query
// Natural language query interface
router.post('/query', async (req, res, next) => {
  // 1. Validate request body
  // 2. Parse query intent
  // 3. Retrieve context (vector search + database queries)
  // 4. Generate response via LLM service
  // 5. Return response with sources
});

// GET /api/llm/match/:id/summary
// Generate match summary
router.get('/match/:id/summary', async (req, res, next) => {
  // 1. Fetch match data
  // 2. Fetch team form, positions
  // 3. Generate summary via LLM service
  // 4. Cache response
  // 5. Return summary
});

// GET /api/llm/club/:id/insights
// Generate club performance insights
router.get('/club/:id/insights', async (req, res, next) => {
  // 1. Fetch club analytics data
  // 2. Fetch recent matches, form
  // 3. Generate insights via LLM service
  // 4. Cache response
  // 5. Return insights
});

// GET /api/llm/analytics/:id/narrative
// Generate season narrative
router.get('/analytics/:id/narrative', async (req, res, next) => {
  // 1. Fetch full timeseries data
  // 2. Identify key moments
  // 3. Generate narrative via LLM service
  // 4. Cache response (longer TTL)
  // 5. Return narrative
});
```

**Integration with Existing Routes:**
- **No changes to existing routes** (standings, clubs, matches, players, analytics)
- LLM endpoints are **additive**, not replacements
- Existing routes remain deterministic, fast, reliable

### 6.2 Data Flow: Database → LLM

**Flow Diagram:**
```
User Request → LLM Route
    ↓
1. Parse Query/Intent
    ↓
2. Database Queries (Parallel)
    ├── Vector Search (pgvector) → Relevant matches/players
    ├── Standings Query → Current positions
    ├── Analytics Query → Timeseries data
    └── Matches Query → Recent form
    ↓
3. Context Assembly
    ├── Filter top 5 most relevant records
    ├── Summarize large datasets
    └── Format for prompt injection
    ↓
4. LLM Service Call
    ├── Build prompt (system + user + context)
    ├── Call OpenAI API
    └── Stream response (if streaming enabled)
    ↓
5. Post-Processing
    ├── Extract citations (match IDs, player names)
    ├── Validate response (check for hallucinations)
    └── Format for frontend
    ↓
6. Cache Response (optional)
    ↓
7. Return to Frontend
```

**Database Query Optimization:**
- **Vector Search:** Use HNSW index for fast similarity search (<10ms)
- **Standings Query:** Use existing `league_standings` view (already optimized)
- **Analytics Query:** Use `club_analytics_timeseries` view (window functions)
- **Parallel Queries:** Use `Promise.all()` to fetch multiple data sources simultaneously

**Context Size Management:**
- **Limit:** Max 10K tokens per context (allows 10+ queries per 128K window)
- **Compression:** Use LLM to summarize large datasets before injection
- **Prioritization:** Include most relevant records first, truncate if needed

### 6.3 Middleware Safeguards

**Rate Limiting Middleware:**
```javascript
// server/middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';

export const llmRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many LLM requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to LLM routes
router.post('/query', llmRateLimiter, async (req, res, next) => { ... });
```

**Input Validation Middleware:**
```javascript
// Validate natural language query
const validateQuery = (req, res, next) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string' || query.length > 500) {
    return res.status(400).json({
      success: false,
      error: 'Invalid query. Must be a string under 500 characters.'
    });
  }
  next();
};
```

**Error Handling Middleware:**
```javascript
// LLM-specific error handler
router.use((err, req, res, next) => {
  if (err.message.includes('OpenAI') || err.message.includes('API')) {
    return res.status(503).json({
      success: false,
      error: 'LLM service temporarily unavailable. Please try again later.',
      retryAfter: 60 // seconds
    });
  }
  next(err);
});
```

**Cost Tracking Middleware:**
```javascript
// Log token usage and cost
const trackLLMCost = (req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    // Log to database or monitoring service
    const duration = Date.now() - startTime;
    // Track: endpoint, tokens, cost, duration
  });
  next();
};
```

---

## 7. Frontend Integration Plan

### 7.1 UI Triggers

**Natural Language Query Interface:**
- **Location:** New page `/query` or component in `Standings.jsx`, `ClubDetail.jsx`
- **Trigger:** User types question in input field, clicks "Ask" button
- **UX Flow:**
  1. User types: "Why is Manchester City in 1st place?"
  2. Click "Ask" → Loading spinner
  3. Display streaming response (if enabled) or wait for full response
  4. Show answer with source citations (clickable links to matches/players)
  5. Query history saved in localStorage

**Match Summary:**
- **Location:** `MatchDetail.jsx` component
- **Trigger:** User clicks "Generate AI Summary" button (collapsed by default)
- **UX Flow:**
  1. Button click → Fetch from `/api/llm/match/:id/summary`
  2. Loading state: "Generating summary..."
  3. Display summary in expandable card
  4. "Regenerate" button for new summary

**Club Insights:**
- **Location:** `ClubDetail.jsx` Performance Dashboard section
- **Trigger:** Automatic on page load (with loading state)
- **UX Flow:**
  1. Page loads → Fetch from `/api/llm/club/:id/insights`
  2. Display loading skeleton
  3. Show insights card alongside charts
  4. "Refresh" button to regenerate

**Season Narrative:**
- **Location:** `ClubDetail.jsx` new "Season Story" section
- **Trigger:** User scrolls to section or clicks "View Season Story"
- **UX Flow:**
  1. Lazy load on scroll into view
  2. Display narrative with highlighted key moments
  3. Timeline visualization (optional)

### 7.2 Streaming vs Non-Streaming

**Decision: Non-Streaming for Initial Implementation**

**Rationale:**
- **Simplicity:** Easier to implement, cache, error handle
- **Cost:** No difference in API cost
- **UX:** Acceptable for insights/summaries (not real-time chat)

**Future Enhancement: Streaming for Natural Language Queries**
- **When:** If natural language query becomes primary interface
- **Implementation:** Use OpenAI streaming API, Server-Sent Events (SSE)
- **UX:** Typewriter effect, feels more responsive

**Non-Streaming Implementation:**
```javascript
// Frontend: src/components/NaturalLanguageQuery.jsx
const [loading, setLoading] = useState(false);
const [response, setResponse] = useState(null);

const handleQuery = async (query) => {
  setLoading(true);
  try {
    const res = await fetch('/api/llm/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    setResponse(data);
  } catch (error) {
    // Error handling
  } finally {
    setLoading(false);
  }
};
```

**Streaming Implementation (Future):**
```javascript
// Frontend: Use EventSource or fetch with stream
const eventSource = new EventSource('/api/llm/query/stream?query=...');
eventSource.onmessage = (event) => {
  const chunk = JSON.parse(event.data);
  setResponse(prev => prev + chunk.text);
};
```

### 7.3 UX for AI-Generated Content

**Design Principles:**
1. **Clear Labeling:** Always label AI-generated content ("AI Summary", "AI Insights")
2. **Source Citations:** Show sources (match IDs, dates) for transparency
3. **Loading States:** Skeleton loaders, progress indicators
4. **Error States:** Friendly error messages, retry buttons
5. **Regeneration:** Allow users to regenerate responses
6. **Collapsible:** Make AI content collapsible to save space

**Component Examples:**

**AI Summary Card:**
```jsx
<motion.div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-white">
      AI Match Summary
    </h3>
    <button onClick={regenerate} className="text-sm text-primary hover:underline">
      Regenerate
    </button>
  </div>
  {loading ? (
    <div className="animate-pulse space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  ) : (
    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
      {summary}
    </p>
  )}
  <div className="mt-4 text-xs text-gray-500">
    Generated by AI • Sources: <Link to={`/match/${matchId}`}>Match Details</Link>
  </div>
</motion.div>
```

**AI Insights Card:**
```jsx
<motion.div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
  <div className="flex items-center gap-2 mb-2">
    <FaLightbulb className="text-accent" />
    <h4 className="font-semibold text-gray-900 dark:text-white">AI Insights</h4>
  </div>
  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
    {insights.map((insight, idx) => (
      <li key={idx} className="flex items-start gap-2">
        <span className="text-accent mt-1">•</span>
        <span>{insight}</span>
      </li>
    ))}
  </ul>
</motion.div>
```

### 7.4 Error Handling

**Frontend Error States:**

**API Error (503):**
```jsx
{error && error.type === 'SERVICE_UNAVAILABLE' && (
  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
    <p className="text-yellow-800 dark:text-yellow-200">
      AI service is temporarily unavailable. Please try again in a few moments.
    </p>
    <button onClick={retry} className="mt-2 text-sm text-yellow-600 hover:underline">
      Retry
    </button>
  </div>
)}
```

**Rate Limit Error (429):**
```jsx
{error && error.type === 'RATE_LIMIT' && (
  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
    <p className="text-orange-800 dark:text-orange-200">
      Too many requests. Please wait {error.retryAfter} seconds before trying again.
    </p>
  </div>
)}
```

**Invalid Query Error (400):**
```jsx
{error && error.type === 'INVALID_QUERY' && (
  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
    <p className="text-red-800 dark:text-red-200">
      {error.message}
    </p>
    <p className="text-sm text-red-600 dark:text-red-400 mt-2">
      Try asking about teams, matches, players, or standings.
    </p>
  </div>
)}
```

**Timeout Error:**
```jsx
{error && error.type === 'TIMEOUT' && (
  <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
    <p className="text-gray-800 dark:text-gray-200">
      Request timed out. The AI service may be experiencing high load.
    </p>
    <button onClick={retry} className="mt-2 text-sm text-gray-600 hover:underline">
      Retry
    </button>
  </div>
)}
```

---

## 8. Security, Cost & Performance Considerations

### 8.1 Token Usage Estimates

**Per-Request Token Estimates:**

**Match Summary:**
- **Input Tokens:** ~500 (match data + context)
- **Output Tokens:** ~200 (3-4 sentence summary)
- **Total:** ~700 tokens
- **Cost (GPT-4 Turbo):** $0.007 (input) + $0.008 (output) = **$0.015 per summary**

**Club Insights:**
- **Input Tokens:** ~1,500 (analytics data + form + comparisons)
- **Output Tokens:** ~300 (3-5 insights)
- **Total:** ~1,800 tokens
- **Cost (GPT-4 Turbo):** $0.021 (input) + $0.012 (output) = **$0.033 per insights**

**Season Narrative:**
- **Input Tokens:** ~3,000 (full timeseries + key moments)
- **Output Tokens:** ~500 (full narrative)
- **Total:** ~3,500 tokens
- **Cost (GPT-4 Turbo):** $0.042 (input) + $0.020 (output) = **$0.062 per narrative**

**Natural Language Query:**
- **Input Tokens:** ~1,000 (query + context)
- **Output Tokens:** ~200 (answer)
- **Total:** ~1,200 tokens
- **Cost (GPT-4 Turbo):** $0.014 (input) + $0.008 (output) = **$0.022 per query**

**Monthly Cost Estimates (Conservative):**
- **Assumptions:**
  - 1,000 match summaries/month
  - 500 club insights/month
  - 200 season narratives/month
  - 2,000 natural language queries/month
- **Calculation:**
  - Match summaries: 1,000 × $0.015 = $15
  - Club insights: 500 × $0.033 = $16.50
  - Season narratives: 200 × $0.062 = $12.40
  - Natural language queries: 2,000 × $0.022 = $44
  - **Total: ~$88/month** (without caching)
- **With 50% Cache Hit Rate:** ~$44/month

**Cost Optimization Strategies:**
1. **Aggressive Caching:** Cache match summaries for 24 hours (matches don't change)
2. **Lazy Loading:** Only generate insights/narratives when user requests them
3. **Model Selection:** Use GPT-3.5 Turbo for simple queries ($0.0015/1K tokens vs $0.01)
4. **Batch Processing:** Generate embeddings in batches (cheaper than individual calls)

### 8.2 Caching Layers

**Multi-Layer Caching Strategy:**

**Layer 1: Response Cache (Redis or In-Memory)**
- **Key:** `hash(endpoint + params + context_hash)`
- **TTL:**
  - Match summaries: 24 hours (matches don't change)
  - Club insights: 6 hours (standings may change)
  - Season narratives: 24 hours (historical data)
  - Natural language queries: 1 hour (may have similar queries)
- **Implementation:** Redis with `SETEX` or in-memory Map with TTL

**Layer 2: Embedding Cache**
- **Key:** `hash(text)`
- **TTL:** Permanent (embeddings don't change for same text)
- **Storage:** PostgreSQL `match_embeddings` table (already stored)

**Layer 3: Database Query Cache**
- **Key:** SQL query hash
- **TTL:** 5 minutes (for standings, recent matches)
- **Implementation:** Express middleware or PostgreSQL query cache

**Cache Invalidation:**
- **Triggers:**
  - New match added → Invalidate match summaries, club insights
  - Standings updated → Invalidate club insights, natural language queries
  - Data refresh (ETL) → Invalidate all caches
- **Strategy:** Event-driven invalidation or scheduled cache clear

### 8.3 Privacy Boundaries

**Data Privacy Considerations:**

**Public Data (Safe to Send to LLM):**
- ✅ Match results (scores, dates, attendance)
- ✅ Player statistics (goals, assists, age, nationality)
- ✅ Team statistics (points, position, form)
- ✅ Manager names, club names
- ✅ Stadium information

**Sensitive Data (Do NOT Send to LLM):**
- ❌ User personal information (if any)
- ❌ API keys, database credentials
- ❌ Internal system information

**PII Scrubbing:**
- **Referee Names:** Optional (public information, but can anonymize if desired)
- **Player Ages/Nationalities:** Safe (public stats)
- **Email/Phone:** Not in current dataset, but add scrubbing if added

**Data Retention:**
- **LLM Provider Logs:** OpenAI retains API data for 30 days (can opt out for enterprise)
- **Application Logs:** Don't log full prompts/responses (log metadata only)
- **User Queries:** Store in database for analytics (optional, with user consent)

### 8.4 Latency Optimization

**Target Latencies:**
- **Match Summary:** <2 seconds
- **Club Insights:** <3 seconds
- **Season Narrative:** <5 seconds
- **Natural Language Query:** <3 seconds

**Optimization Strategies:**

1. **Parallel Data Fetching:**
   ```javascript
   const [matchData, formData, standingsData] = await Promise.all([
     fetchMatch(matchId),
     fetchTeamForm(teamId),
     fetchStandings()
   ]);
   ```

2. **Context Compression:**
   - Summarize large datasets before injection
   - Use LLM to compress: "38 matchweeks → 5 key moments"

3. **Streaming Responses (Future):**
   - Use OpenAI streaming API
   - Display partial responses as they arrive

4. **Pre-Generation (Background Jobs):**
   - Generate match summaries after matches are added
   - Store in database, serve instantly

5. **Model Selection:**
   - Use GPT-3.5 Turbo for simple queries (faster, cheaper)
   - Use GPT-4 Turbo only for complex analysis

6. **Database Optimization:**
   - Ensure vector search indexes are optimized (HNSW)
   - Use connection pooling (already implemented)

**Monitoring:**
- Track p50, p95, p99 latencies
- Alert if p95 > target latency
- Log slow queries for optimization

---

## 9. Risks & Anti-Patterns

### 9.1 Areas to Avoid LLM Usage

**❌ Deterministic Calculations:**
- **Standings Calculation:** Use SQL view `league_standings` (Points = 3×W + 1×D, sorted by GD, GF)
- **Goal Difference:** Simple subtraction (gf - ga)
- **Form Guide:** Map match results to W/D/L (deterministic logic)
- **Matchweek Calculation:** Days since season start / 7 (deterministic)

**❌ Real-Time Data:**
- **Live Scores:** LLM cannot provide real-time updates (use WebSocket/polling)
- **Current Match Status:** Deterministic data retrieval, not generation

**❌ Data Validation:**
- **ETL Validation:** Rule-based checks (date ranges, goal ranges) are deterministic
- **Input Validation:** Regex, type checks (not LLM-appropriate)

**❌ Critical Path Operations:**
- **Core API Endpoints:** `/api/standings`, `/api/matches` should remain deterministic
- **Database Queries:** SQL queries should not be generated by LLM for core features

**❌ Security-Sensitive Operations:**
- **Authentication:** Never use LLM for password validation, session management
- **Authorization:** Role-based access control is deterministic

### 9.2 Hallucination Mitigation

**Risk:** LLM may generate false information (hallucinations)

**Mitigation Strategies:**

1. **Strict Context Injection:**
   - Only provide factual data in context
   - No open-ended prompts that allow speculation

2. **Response Validation:**
   - Extract claims from LLM response (match IDs, dates, scores)
   - Verify against database
   - Flag responses with unverifiable claims

3. **Citation Requirements:**
   - Force LLM to cite sources (match IDs, dates)
   - Display citations in UI for user verification

4. **Confidence Scores:**
   - Ask LLM to rate confidence (1-10) for each claim
   - Hide low-confidence responses or flag them

5. **Human Review (Optional):**
   - Flag unusual responses for human review
   - Maintain whitelist of approved responses

**Example Validation:**
```javascript
// Extract match IDs from LLM response
const matchIds = extractMatchIds(llmResponse);
// Verify matches exist in database
const validMatches = await verifyMatches(matchIds);
if (matchIds.length !== validMatches.length) {
  // Flag response as potentially hallucinated
  logWarning('LLM response contains invalid match IDs');
}
```

### 9.3 Cost Overrun Prevention

**Risk:** Uncontrolled API usage leads to high costs

**Mitigation Strategies:**

1. **Rate Limiting:**
   - 10 queries per user per minute
   - 100 requests per hour per IP
   - Hard limit: 1,000 requests per day (configurable)

2. **Budget Alerts:**
   - Track daily/monthly costs
   - Alert if daily cost > $5 or monthly > $100
   - Auto-disable LLM endpoints if budget exceeded

3. **Caching:**
   - Aggressive caching (50%+ cache hit rate target)
   - Cache match summaries for 24 hours
   - Cache club insights for 6 hours

4. **Lazy Loading:**
   - Don't pre-generate all summaries
   - Generate on-demand only

5. **Model Selection:**
   - Use GPT-3.5 Turbo for simple queries (10x cheaper)
   - Use GPT-4 Turbo only for complex analysis

6. **Token Limits:**
   - Max 10K tokens per context
   - Max 1K tokens per response
   - Truncate context if exceeds limit

**Budget Monitoring:**
```javascript
// Track costs in database
const trackCost = async (endpoint, tokens, cost) => {
  await db.query(`
    INSERT INTO llm_usage (endpoint, tokens, cost, timestamp)
    VALUES ($1, $2, $3, NOW())
  `, [endpoint, tokens, cost]);
  
  // Check daily budget
  const dailyCost = await db.query(`
    SELECT SUM(cost) FROM llm_usage
    WHERE timestamp > NOW() - INTERVAL '1 day'
  `);
  
  if (dailyCost > 5) {
    // Alert and potentially disable
    sendAlert('Daily LLM budget exceeded');
  }
};
```

### 9.4 Performance Degradation

**Risk:** LLM calls slow down application

**Mitigation Strategies:**

1. **Async Processing:**
   - Generate summaries/insights in background
   - Return immediately with "Generating..." message
   - Poll for completion or use WebSocket

2. **Timeout Handling:**
   - 10-second timeout for LLM calls
   - Fallback to cached response or error message

3. **Circuit Breaker:**
   - If LLM service fails 3 times in a row, disable for 5 minutes
   - Return graceful error message

4. **Load Shedding:**
   - Under high load, prioritize critical endpoints
   - Defer non-critical LLM features

5. **Database Optimization:**
   - Ensure vector search is fast (<10ms)
   - Use indexes for all LLM-related queries

### 9.5 Data Quality Risks

**Risk:** LLM responses based on incorrect or outdated data

**Mitigation Strategies:**

1. **Data Freshness Checks:**
   - Verify data is up-to-date before generating response
   - Invalidate cache if data changes

2. **Source Verification:**
   - Always cite sources (match IDs, dates)
   - Allow users to verify claims

3. **Error Handling:**
   - If data is missing, LLM should say "I don't have that information"
   - Don't generate responses from incomplete data

### 9.6 User Experience Risks

**Risk:** LLM responses confuse or mislead users

**Mitigation Strategies:**

1. **Clear Labeling:**
   - Always label AI-generated content
   - Add disclaimer: "Generated by AI, verify facts"

2. **Source Citations:**
   - Show sources for all claims
   - Link to original data (matches, players)

3. **Regeneration Option:**
   - Allow users to regenerate responses
   - Show multiple responses if needed

4. **Feedback Mechanism:**
   - "Was this helpful?" button
   - Report inaccurate responses

5. **Fallback to Deterministic Data:**
   - If LLM fails, show raw data (standings, stats)
   - Don't block users from accessing data

---

## Conclusion

This System Design Document provides a comprehensive blueprint for integrating LLM capabilities into the Premier League Analytics Hub. The architecture prioritizes:

1. **High-Value Use Cases:** Natural language queries, performance insights, match summaries
2. **Production Readiness:** Caching, rate limiting, error handling, cost controls
3. **User Experience:** Clear labeling, source citations, graceful degradation
4. **Risk Mitigation:** Hallucination prevention, cost controls, performance optimization

**Next Steps:**
1. Review and approve this design document
2. Set up development environment (OpenAI API key, vector database)
3. Begin Phase 1 implementation (Foundation)
4. Iterate based on user feedback and performance metrics

**Success Metrics:**
- Response accuracy: <5% hallucination rate
- User satisfaction: >80% positive feedback
- Cost efficiency: <$100/month with caching
- Performance: <3s average response time
- Adoption: >50% of users interact with LLM features

---

**Document End**

