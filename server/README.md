# Premier League Analytics API Server

Express.js backend server for the Premier League Analytics app, connecting to PostgreSQL (Supabase) database.

## Features

- ✅ Express.js server with connection pooling
- ✅ PostgreSQL connection via Supabase
- ✅ CORS middleware for frontend integration
- ✅ JSON parsing middleware
- ✅ Error handling middleware
- ✅ Request logging with response times
- ✅ Sub-200ms response time monitoring
- ✅ Graceful shutdown handling

## API Endpoints

### Standings
- `GET /api/standings` - Get league standings from `league_standings` view

### Clubs
- `GET /api/clubs` - List all clubs with stadium information
- `GET /api/clubs/:id` - Get club details with stadium and statistics
- `GET /api/clubs/:id/squad` - Get all players for a club

### Matches
- `GET /api/matches` - Get all matches (supports `?gameweek` query parameter)
- `GET /api/matches/:id` - Get specific match details

### Health Check
- `GET /health` - Server and database health check

## Setup

### 1. Install Dependencies

```powershell
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `server/` directory (or root directory):

```powershell
copy server\.env.example .env
```

Edit `.env` and add your Supabase connection string:

```
SUPABASE_CONNECTION_STRING=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

To get your Supabase connection string:
1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **Database**
3. Copy the **Connection string** (URI format)

### 3. Start the Server

```powershell
npm run server
```

For development with auto-reload (requires Node.js 18+):

```powershell
npm run server:dev
```

The server will start on `http://localhost:5000`

## API Usage Examples

### Get League Standings

```bash
GET http://localhost:5000/api/standings
```

Response:
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
    },
    ...
  ],
  "duration": "45ms"
}
```

### Get All Clubs

```bash
GET http://localhost:5000/api/clubs
```

### Get Club Details

```bash
GET http://localhost:5000/api/clubs/{club_id}
```

### Get Club Squad

```bash
GET http://localhost:5000/api/clubs/{club_id}/squad
```

### Get All Matches

```bash
GET http://localhost:5000/api/matches
```

### Get Matches by Gameweek

```bash
GET http://localhost:5000/api/matches?gameweek=1
```

### Get Match Details

```bash
GET http://localhost:5000/api/matches/{match_id}
```

### Health Check

```bash
GET http://localhost:5000/health
```

## Response Format

All API responses follow this format:

**Success:**
```json
{
  "success": true,
  "count": 20,
  "data": [...],
  "duration": "45ms"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Performance

The server monitors response times and logs warnings if queries exceed 200ms:

```
⚠ Standings query took 250ms (target: <200ms)
```

## Error Handling

- **400 Bad Request**: Invalid parameters (e.g., invalid UUID format, invalid gameweek)
- **404 Not Found**: Resource not found (e.g., club/match doesn't exist)
- **500 Internal Server Error**: Database or server errors

## Database Connection Pool

The server uses a PostgreSQL connection pool with:
- Maximum 20 connections
- 30-second idle timeout
- 2-second connection timeout

## CORS Configuration

CORS is enabled for the frontend URL specified in `FRONTEND_URL` environment variable (default: `http://localhost:5173` for Vite).

## Testing with Postman

1. Import the API endpoints into Postman
2. Set base URL: `http://localhost:5000`
3. Test each endpoint:
   - `GET /api/standings`
   - `GET /api/clubs`
   - `GET /api/clubs/{id}`
   - `GET /api/clubs/{id}/squad`
   - `GET /api/matches`
   - `GET /api/matches?gameweek=1`

## Troubleshooting

### Connection Errors

If you get database connection errors:
1. Verify your Supabase connection string is correct
2. Check that your IP is allowed in Supabase firewall settings
3. Ensure your database password is correct
4. Check that the database schema is set up correctly

### Port Already in Use

If port 5000 is already in use:
1. Change `PORT` in `.env` file
2. Or kill the process using port 5000:
   ```powershell
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F
   ```

### Slow Response Times

If queries are slow:
1. Check database indexes are created
2. Verify connection pool settings
3. Check Supabase project performance metrics
4. Review query execution plans

## Project Structure

```
server/
├── server.js          # Main Express server file
├── routes/
│   ├── standings.js   # Standings API routes
│   ├── clubs.js       # Clubs API routes
│   └── matches.js     # Matches API routes
├── .env.example       # Environment variables template
└── README.md          # This file
```

## License

Part of the Premier League 2023/24 Analytics Hub project.

