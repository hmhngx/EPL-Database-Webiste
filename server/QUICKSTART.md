# Quick Start Guide

## 1. Install Dependencies

```powershell
npm install
```

This will install:
- `express` - Web framework
- `pg` - PostgreSQL client
- `cors` - CORS middleware
- `dotenv` - Environment variables

## 2. Set Up Environment Variables

Create a `.env` file in the project root (or copy from `server/env.example`):

```powershell
# In project root
copy server\env.example .env
```

Edit `.env` and add your Supabase connection string:

```
SUPABASE_CONNECTION_STRING=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## 3. Start the Server

```powershell
npm run server
```

You should see:
```
============================================================
Premier League Analytics API Server
Server running on http://localhost:5000
Environment: development
============================================================
✓ Database connection pool established
```

## 4. Test the Server

### Health Check
```powershell
curl http://localhost:5000/health
```

### Test API Endpoints

**Get Standings:**
```powershell
curl http://localhost:5000/api/standings
```

**Get All Clubs:**
```powershell
curl http://localhost:5000/api/clubs
```

**Get Matches:**
```powershell
curl http://localhost:5000/api/matches
```

**Get Matches by Gameweek:**
```powershell
curl http://localhost:5000/api/matches?gameweek=1
```

## 5. Test with Postman

1. Open Postman
2. Create a new request
3. Set method to `GET`
4. Enter URL: `http://localhost:5000/api/standings`
5. Click "Send"

Expected response:
```json
{
  "success": true,
  "count": 20,
  "data": [...],
  "duration": "45ms"
}
```

## Troubleshooting

### "Cannot find module" errors
- Run `npm install` again
- Check that `node_modules` folder exists

### Database connection errors
- Verify your Supabase connection string in `.env`
- Check Supabase firewall settings
- Ensure database schema is set up (run `database/schema.sql`)

### Port 5000 already in use
- Change `PORT` in `.env` file
- Or kill the process: `netstat -ano | findstr :5000`

### Server starts but endpoints return errors
- Check database tables exist
- Verify data is loaded (use ETL script)
- Check server console for error messages

## Next Steps

1. ✅ Server running on port 5000
2. ✅ Database connected
3. ✅ API endpoints responding
4. ✅ Test with Postman
5. Connect frontend to API

