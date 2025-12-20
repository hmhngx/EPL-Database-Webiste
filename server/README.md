# Premier League Analytics API Server

Express.js RESTful API server for the Premier League Analytics Hub application. Provides backend services connecting to PostgreSQL (Supabase) database with optimized connection pooling, comprehensive error handling, and performance monitoring.

## 🏗️ Architecture

- **Framework**: Express.js 4.x
- **Database**: PostgreSQL (via Supabase)
- **Connection Management**: pg connection pool (max 20 connections)
- **CORS**: Configured for frontend integration
- **Environment**: Node.js 18+ with ES modules

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```powershell
# Copy the example file
Copy-Item server\env.example .env
```

Edit `.env` and add your configuration:

```env
SUPABASE_CONNECTION_STRING=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 3. Start the Server

```powershell
# Standard start
npm run server

# Development mode with auto-reload (Node.js 18+)
npm run server:dev
```

The server will start on `http://localhost:5000` (or the port specified in `.env`).

## 📡 API Endpoints

### Standings

#### `GET /api/standings`

Get current Premier League standings with point adjustments (PSR breaches).

**Response:**
```json
{
  "success": true,
  "count": 20,
  "data": [
    {
      "team_id": "uuid",
      "team_name": "Manchester City",
      "mp": 38,
      "w": 28,
      "d": 5,
      "l": 5,
      "gf": 91,
      "ga": 33,
      "gd": 58,
      "pts": 89,
      "total_adjustment": 0,
      "adjusted_pts": 89,
      "logo_url": "https://..."
    }
  ],
  "duration": "45ms"
}
```

**Features:**
- Includes point adjustments from `point_adjustments` table
- Returns both `pts` (match-derived) and `adjusted_pts` (with deductions/additions)
- Ordered by `adjusted_pts DESC, gd DESC`
- Includes club logos from database or fallback to UI-Avatars

### Clubs

#### `GET /api/clubs`

List all Premier League clubs with stadium information.

**Response:**
```json
{
  "success": true,
  "count": 20,
  "data": [
    {
      "team_id": "uuid",
      "team_name": "Manchester United",
      "founded": 1878,
      "logo_url": "https://...",
      "stadium": {
        "id": "uuid",
        "stadium_name": "Old Trafford",
        "city": "Manchester",
        "capacity": 74310
      }
    }
  ],
  "duration": "32ms"
}
```

#### `GET /api/clubs/:id`

Get detailed information about a specific club.

**Parameters:**
- `id` (UUID) - Club ID

**Response:**
```json
{
  "success": true,
  "data": {
    "team_id": "uuid",
    "team_name": "Manchester United",
    "founded": 1878,
    "logo_url": "https://...",
    "stadium": { ... },
    "statistics": {
      "matches_played": 38,
      "wins": 18,
      "draws": 6,
      "losses": 14
    }
  },
  "duration": "28ms"
}
```

#### `GET /api/clubs/:id/squad`

Get all players for a specific club.

**Parameters:**
- `id` (UUID) - Club ID

**Response:**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "id": "uuid",
      "player_name": "Bruno Fernandes",
      "position": "Midfielder",
      "nationality": "Portugal",
      "age": 29
    }
  ],
  "duration": "15ms"
}
```

### Matches

#### `GET /api/matches`

Get all matches. Supports optional `matchweek` and `orderBy` query parameters.

**Query Parameters:**
- `matchweek` (integer, optional) - Filter by matchweek (1-38)
- `orderBy` (string, optional) - Sort order: `date`, `goals`, `total_goals`, `goal_difference`, `matchweek`, `attendance`
- `orderDir` (string, optional) - Sort direction: `ASC` or `DESC` (default: `DESC`)

**Examples:**
```bash
# Get all matches
GET /api/matches

# Get matches for matchweek 1
GET /api/matches?matchweek=1

# Get matches sorted by attendance (highest first)
GET /api/matches?orderBy=attendance&orderDir=DESC
```

**Response:**
```json
{
  "success": true,
  "count": 380,
  "data": [
    {
      "id": "uuid",
      "date": "2023-08-12T15:00:00Z",
      "home_team": {
        "team_id": "uuid",
        "team_name": "Manchester United"
      },
      "away_team": {
        "team_id": "uuid",
        "team_name": "Liverpool"
      },
      "home_team_score": 2,
      "away_team_score": 1,
      "attendance": 70000,
      "matchweek": 1,
      "youtube_id": "dQw4w9WgXcQ"
    }
  ],
  "duration": "67ms"
}
```

#### `GET /api/matches/:id`

Get detailed information about a specific match.

**Parameters:**
- `id` (UUID) - Match ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "date": "2023-08-12T15:00:00Z",
    "home_team": { ... },
    "away_team": { ... },
    "home_team_score": 2,
    "away_team_score": 1,
      "attendance": 70000,
      "matchweek": 1,
      "youtube_id": "dQw4w9WgXcQ"
  },
  "duration": "22ms"
}
```

### Analytics

#### `GET /api/analytics/club/:id`

Get timeseries analytics for a specific club. Returns cumulative statistics and league position by matchweek.

**Parameters:**
- `id` (UUID) - Club/Team UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "timeseries": [
      {
        "team_id": "uuid",
        "team_name": "Manchester United",
        "matchweek": 1,
        "date": "2023-08-12T15:00:00Z",
        "venue": "Home",
        "goals_scored": 2,
        "goals_conceded": 1,
        "points": 3,
        "result": "W",
        "cumulative_points": 3,
        "cumulative_gd": 1,
        "cumulative_gf": 2,
        "cumulative_ga": 1,
        "position": 5,
        "opponent_name": "Liverpool"
      }
    ],
    "totalMatches": 38
  },
  "count": 38,
  "duration": "67ms"
}
```

**Features:**
- Uses `club_analytics_timeseries` view with window functions
- Calculates cumulative statistics (points, goal difference, goals for/against)
- Includes league position ranking with tie-breakers
- Supports venue filtering (Home/Away) in frontend

### Players

#### `GET /api/players`

List all players across all clubs.

**Response:**
```json
{
  "success": true,
  "count": 550,
  "data": [
    {
      "player_id": "uuid",
      "name": "Mohamed Salah",
      "position": "Forward",
      "nationality": "Egypt",
      "age": 31,
      "team": {
        "team_id": "uuid",
        "team_name": "Liverpool"
      }
    }
  ],
  "duration": "89ms"
}
```

### Health Check

#### `GET /health`

Check server and database connection status.

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 📊 Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "count": 20,
  "data": [ ... ],
  "duration": "45ms"
}
```

- `success` (boolean) - Always `true` for successful requests
- `count` (integer) - Number of items in `data` array
- `data` (array/object) - Response data
- `duration` (string) - Query execution time

### Error Response

```json
{
  "success": false,
  "error": "Error message description"
}
```

- `success` (boolean) - Always `false` for errors
- `error` (string) - Error message

## 🔒 Error Handling

### HTTP Status Codes

- **200 OK** - Successful request
- **400 Bad Request** - Invalid parameters (e.g., invalid UUID format, invalid gameweek)
- **404 Not Found** - Resource not found (e.g., club/match doesn't exist)
- **500 Internal Server Error** - Database or server errors

### Common Error Scenarios

**Invalid UUID Format:**
```json
{
  "success": false,
  "error": "Invalid team ID format. Expected UUID."
}
```

**Resource Not Found:**
```json
{
  "success": false,
  "error": "Team not found"
}
```

**Database Connection Error:**
```json
{
  "success": false,
  "error": "Database connection failed"
}
```

## ⚡ Performance

### Connection Pooling

The server uses PostgreSQL connection pooling with the following configuration:
- **Maximum connections**: 10 (reduced for stability)
- **Idle timeout**: 30 seconds
- **Connection timeout**: 2 seconds

### Advanced SQL Features

- **Window Functions**: Used in `club_analytics_timeseries` view for cumulative calculations
- **Prepared Statements**: All queries use parameterized statements for security and performance
- **Transactions**: ETL script uses batch transactions (500 rows per transaction)
- **Composite Indexes**: Optimized indexes for common query patterns

### Response Time Monitoring

The server logs warnings if queries exceed 200ms:

```
⚠ Standings query took 250ms (target: <200ms)
```

### Optimization Tips

1. **Database Indexes**: Ensure indexes are created on frequently queried columns
2. **Connection Pool**: Monitor pool usage and adjust max connections if needed
3. **Query Optimization**: Review slow queries and optimize SQL statements
4. **Caching**: Consider implementing Redis for frequently accessed data

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SUPABASE_CONNECTION_STRING` | PostgreSQL connection string | Yes | - |
| `PORT` | Server port | No | 5000 |
| `NODE_ENV` | Environment mode | No | development |
| `FRONTEND_URL` | Frontend URL for CORS | No | http://localhost:5173 |

### CORS Configuration

CORS is enabled for the frontend URL specified in `FRONTEND_URL` environment variable. The server allows:
- **Origin**: Value from `FRONTEND_URL`
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization

## 🧪 Testing

### Manual Testing with cURL

```powershell
# Health check
curl http://localhost:5000/health

# Get standings
curl http://localhost:5000/api/standings

# Get all clubs
curl http://localhost:5000/api/clubs

# Get specific club
curl http://localhost:5000/api/clubs/[TEAM-UUID]

# Get matches
curl http://localhost:5000/api/matches

# Get matches by gameweek
curl http://localhost:5000/api/matches?gameweek=1
```

### Testing with Postman

1. Import the API endpoints into Postman
2. Set base URL: `http://localhost:5000`
3. Test each endpoint:
   - `GET /health`
   - `GET /api/standings`
   - `GET /api/clubs`
   - `GET /api/clubs/{id}`
   - `GET /api/clubs/{id}/squad`
   - `GET /api/matches`
   - `GET /api/matches?gameweek=1`
   - `GET /api/matches/{id}`
   - `GET /api/players`

## 🐛 Troubleshooting

### Connection Errors

**Issue**: Database connection errors

**Solutions**:
1. Verify Supabase connection string is correct
2. Check that your IP is allowed in Supabase firewall settings
3. Ensure database password is correct (URL-encode special characters)
4. Check Supabase dashboard for connection issues

### Port Already in Use

**Issue**: Port 5000 is already in use

**Solutions**:
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace <PID> with actual process ID)
taskkill /PID <PID> /F

# Or change PORT in .env file
```

### Slow Response Times

**Issue**: Queries are slow

**Solutions**:
1. Check database indexes are created (see `database/schema.sql`)
2. Verify connection pool settings
3. Check Supabase project performance metrics
4. Review query execution plans in Supabase dashboard

### CORS Errors

**Issue**: Frontend cannot access API

**Solutions**:
1. Verify `FRONTEND_URL` in `.env` matches your frontend URL
2. Check that CORS middleware is enabled
3. Ensure frontend is making requests to correct origin

## 📁 Project Structure

```
server/
├── server.js          # Main Express server file
├── routes/            # API route handlers
│   ├── standings.js   # Standings endpoints
│   ├── clubs.js       # Clubs endpoints
│   ├── matches.js     # Matches endpoints
│   └── players.js     # Players endpoints
├── env.example        # Environment variables template
└── README.md          # This file
```

## 📝 Logging

The server logs:
- Server startup information
- Database connection status
- Request/response times
- Performance warnings (queries > 200ms)
- Error messages

## 🔐 Security Considerations

1. **Environment Variables**: Never commit `.env` file to version control
2. **Connection String**: Keep database credentials secure
3. **CORS**: Only allow trusted frontend origins
4. **Input Validation**: All endpoints validate UUID formats and parameters
5. **Error Messages**: Avoid exposing sensitive information in error responses

## 📚 Related Documentation

- **[Main README](../README.md)** - Project overview and setup
- **[Database README](../database/README.md)** - Database schema and setup
- **[ETL README](../etl/README.md)** - Data ingestion guide

## 📄 License

Part of the Premier League 2023/24 Analytics Hub project.

---

**© 2023/2024 Premier League Analytics Hub. Data provided by EPL Data.**
