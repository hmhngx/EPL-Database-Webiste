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

Get current Premier League standings.

**Response:**
```json
{
  "success": true,
  "count": 20,
  "data": [
    {
      "club_id": "uuid",
      "club": "Manchester City",
      "mp": 38,
      "w": 28,
      "d": 5,
      "l": 5,
      "gf": 91,
      "ga": 33,
      "gd": 58,
      "pts": 89
    }
  ],
  "duration": "45ms"
}
```

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
      "club_id": "uuid",
      "name": "Manchester United",
      "founded": 1878,
      "logo_url": "https://...",
      "stadium": {
        "stadium_id": "uuid",
        "name": "Old Trafford",
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
    "club_id": "uuid",
    "name": "Manchester United",
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
      "player_id": "uuid",
      "name": "Bruno Fernandes",
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

Get all matches. Supports optional `gameweek` query parameter.

**Query Parameters:**
- `gameweek` (integer, optional) - Filter by gameweek (1-38)

**Examples:**
```bash
# Get all matches
GET /api/matches

# Get matches for gameweek 1
GET /api/matches?gameweek=1
```

**Response:**
```json
{
  "success": true,
  "count": 380,
  "data": [
    {
      "match_id": "uuid",
      "date": "2023-08-12T15:00:00Z",
      "home_club": {
        "club_id": "uuid",
        "name": "Manchester United"
      },
      "away_club": {
        "club_id": "uuid",
        "name": "Liverpool"
      },
      "home_goals": 2,
      "away_goals": 1,
      "attendance": 70000,
      "referee": "Michael Oliver",
      "gameweek": 1
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
    "match_id": "uuid",
    "date": "2023-08-12T15:00:00Z",
    "home_club": { ... },
    "away_club": { ... },
    "home_goals": 2,
    "away_goals": 1,
    "attendance": 70000,
    "referee": "Michael Oliver",
    "gameweek": 1,
    "youtube_link": "https://..."
  },
  "duration": "22ms"
}
```

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
      "club": {
        "club_id": "uuid",
        "name": "Liverpool"
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
  "error": "Invalid club ID format. Expected UUID."
}
```

**Resource Not Found:**
```json
{
  "success": false,
  "error": "Club not found"
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
- **Maximum connections**: 20
- **Idle timeout**: 30 seconds
- **Connection timeout**: 2 seconds

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
curl http://localhost:5000/api/clubs/[CLUB-UUID]

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
