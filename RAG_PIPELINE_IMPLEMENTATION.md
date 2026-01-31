# RAG Pipeline Implementation Summary

This document summarizes the complete RAG (Retrieval-Augmented Generation) pipeline implementation for match embeddings.

## ✅ Completed Components

### 1. Data Context Constructor
**File:** `scripts/generateMatchContext.py`

- Generates rich narrative text for each match
- Joins data from `matches`, `match_stats`, `match_events`, `team`, and `stadiums` tables
- Creates human-readable narratives like:
  > "Matchweek 5: Arsenal beat Everton 1-0 at Goodison Park. Arsenal goal scored by Leandro Trossard (69'). Arsenal dominated with 63.8% possession and 13 shots compared to Everton's 37.2% and 8 shots. The match had 1 yellow card for Gabriel Magalhães."

### 2. Embedding Ingestion Pipeline
**File:** `scripts/populateEmbeddings.py`

- Fetches matches that don't have embeddings yet (or have been updated)
- Uses OpenAI `text-embedding-3-small` model to generate 1536-dimension vectors
- Populates `metadata` JSONB column with:
  ```json
  {
    "home_team": "Arsenal",
    "away_team": "Everton",
    "score": "1-0",
    "matchweek": 5,
    "date": "2023-09-17T15:00:00Z"
  }
  ```
- Batch upsert using SQLAlchemy
- **Error Handling:**
  - Exponential backoff for rate limits (1s, 2s, 4s, 8s, 16s)
  - Retries on 5xx API errors
  - Continues processing on individual match errors
- **Cost Tracking:** Logs token usage and cost per batch
- **Performance:** Processes 100 matches per batch

### 3. Database Search Function
**File:** `database/migrations/create_match_semantic_search_function.sql`

- PostgreSQL function: `match_semantic_search`
- Parameters:
  - `query_embedding` (vector): The query embedding vector
  - `match_count` (int): Maximum number of matches to return (default: 5)
  - `filter_metadata` (jsonb): Optional filters (e.g., `{"home_team": "Arsenal"}`)
- Returns: Match details with similarity scores
- Uses cosine similarity (`<=>` operator) for fast vector search
- Supports metadata filtering by `home_team`, `away_team`, or `matchweek`

### 4. Backend RAG Service
**File:** `server/services/aiSearchService.js`

- **Functions:**
  - `generateQueryEmbedding(query)`: Converts natural language to embedding
  - `searchMatches(pool, query, options)`: Performs semantic search
  - `getMatchContextForLLM(pool, query, options)`: Returns top 3 content_text snippets for LLM context
  - `getRelevantMatches(pool, query, options)`: Returns full match details
- **Usage Example:**
  ```javascript
  import { getMatchContextForLLM } from './services/aiSearchService.js';
  
  const context = await getMatchContextForLLM(pool, 
    "Tell me about high-scoring games in London", 
    { matchCount: 3 }
  );
  ```

### 5. Performance Optimization
**Implemented in:** `scripts/populateEmbeddings.py`

- **HNSW Index:** Automatically creates HNSW index on `match_embeddings.embedding` column
  ```sql
  CREATE INDEX idx_match_embeddings_hnsw 
  ON match_embeddings 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
  ```
- **Error Handling:** Exponential backoff for rate limits
- **Cost Logging:** Tracks and logs cost per batch based on token usage

## 📁 File Structure

```
football-api/
├── scripts/
│   ├── generateMatchContext.py      # Generate rich narratives
│   ├── populateEmbeddings.py        # Generate and store embeddings
│   └── README.md                    # Scripts documentation
├── database/
│   └── migrations/
│       └── create_match_semantic_search_function.sql  # SQL function
├── server/
│   └── services/
│       └── aiSearchService.js         # Backend RAG service
└── requirements.txt                 # Updated with openai>=1.0.0
```

## 🚀 Setup Instructions

### 1. Install Dependencies

```powershell
# Python dependencies
pip install -r requirements.txt

# Node.js dependencies (already in package.json)
npm install
```

### 2. Set Environment Variables

```powershell
# In your .env file or environment
$env:SUPABASE_CONNECTION_STRING="postgresql://postgres:password@db.project.supabase.co:5432/postgres"
$env:OPENAI_API_KEY="sk-..."
```

### 3. Enable pgvector Extension

Run in Supabase SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4. Create Semantic Search Function

Run the migration:
```sql
-- Copy and paste contents of:
-- database/migrations/create_match_semantic_search_function.sql
```

### 5. Populate Embeddings

```powershell
python scripts/populateEmbeddings.py
```

This will:
- Create `match_embeddings` table if it doesn't exist
- Create HNSW index for fast similarity search
- Generate embeddings for all matches
- Log total cost and tokens used

## 📊 Database Schema

### `match_embeddings` Table

```sql
CREATE TABLE match_embeddings (
    match_id UUID PRIMARY KEY,
    embedding vector(1536) NOT NULL,
    content_text TEXT NOT NULL,
    metadata JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_match_embeddings_match
        FOREIGN KEY (match_id)
        REFERENCES matches(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
```

## 💰 Cost Estimation

- **Model:** `text-embedding-3-small`
- **Pricing:** $0.02 per 1M tokens
- **Average match narrative:** ~200 tokens
- **380 matches:** ~76,000 tokens ≈ **$0.0015** (very cheap!)

## 🔍 Usage Examples

### Backend Service Usage

```javascript
import { getMatchContextForLLM, getRelevantMatches } from './services/aiSearchService.js';

// Get context for LLM prompt
const context = await getMatchContextForLLM(pool, 
  "Tell me about high-scoring games in London",
  { matchCount: 3 }
);
// Returns: ["Matchweek 5: Arsenal beat...", "Matchweek 12: ...", ...]

// Get full match details with similarity scores
const matches = await getRelevantMatches(pool,
  "Arsenal's best performances",
  {
    matchCount: 5,
    filterMetadata: { home_team: "Arsenal" }
  }
);
// Returns: [{ match_id, content_text, similarity, metadata, ... }, ...]
```

### SQL Function Usage

```sql
-- Search for similar matches
SELECT * FROM match_semantic_search(
  '[0.1, 0.2, ...]'::vector(1536),  -- query embedding
  5,                                 -- match_count
  '{"home_team": "Arsenal"}'::jsonb -- filter_metadata
);
```

## 🐛 Troubleshooting

### "pgvector extension not available"
- Run `CREATE EXTENSION IF NOT EXISTS vector;` in Supabase

### "match_embeddings table does not exist"
- The script creates it automatically, or create manually using SQL in README

### "match_semantic_search function not found"
- Run the migration: `database/migrations/create_match_semantic_search_function.sql`

### Rate Limit Errors
- Script automatically retries with exponential backoff
- If persistent, reduce `BATCH_SIZE` in `populateEmbeddings.py`

## 📝 Next Steps

1. **Run the embedding population script** to generate embeddings for all matches
2. **Test the semantic search** using the backend service
3. **Integrate with LLM routes** to use match context in prompts
4. **Monitor costs** - embeddings are very cheap, but track usage

## 🔗 Related Files

- `server/services/llmService.js` - Existing LLM service (can be extended)
- `LLM_INTEGRATION_SYSTEM_DESIGN.md` - Original design document
- `scripts/README.md` - Detailed scripts documentation

