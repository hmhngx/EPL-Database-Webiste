-- ============================================
-- Match Semantic Search Function
-- ============================================
-- PostgreSQL function for semantic search using vector similarity
-- 
-- Parameters:
--   query_embedding: vector(1536) - The query embedding vector
--   match_count: int - Maximum number of matches to return (default: 5)
--   filter_metadata: jsonb - Optional metadata filters (e.g., {"home_team": "Arsenal"})
--
-- Returns:
--   Table with match details and similarity scores
-- ============================================

CREATE OR REPLACE FUNCTION match_semantic_search(
    query_embedding vector(1536),
    match_count int DEFAULT 5,
    filter_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    match_id UUID,
    content_text TEXT,
    similarity FLOAT,
    metadata JSONB,
    home_team TEXT,
    away_team TEXT,
    score TEXT,
    matchweek INTEGER,
    date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        me.match_id,
        me.content_text,
        1 - (me.embedding <=> query_embedding) AS similarity,
        me.metadata,
        me.metadata->>'home_team' AS home_team,
        me.metadata->>'away_team' AS away_team,
        me.metadata->>'score' AS score,
        (me.metadata->>'matchweek')::INTEGER AS matchweek,
        (me.metadata->>'date')::TIMESTAMP WITH TIME ZONE AS date
    FROM match_embeddings me
    WHERE 
        -- Apply metadata filters if provided
        (
            filter_metadata = '{}'::jsonb
            OR (
                -- Filter by home_team if provided
                (filter_metadata->>'home_team' IS NULL OR me.metadata->>'home_team' = filter_metadata->>'home_team')
                AND
                -- Filter by away_team if provided
                (filter_metadata->>'away_team' IS NULL OR me.metadata->>'away_team' = filter_metadata->>'away_team')
                AND
                -- Filter by matchweek if provided
                (filter_metadata->>'matchweek' IS NULL OR me.metadata->>'matchweek' = filter_metadata->>'matchweek')
            )
        )
    ORDER BY me.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users (adjust as needed)
-- GRANT EXECUTE ON FUNCTION match_semantic_search TO authenticated;

COMMENT ON FUNCTION match_semantic_search IS 
'Performs semantic search on match embeddings using cosine similarity. 
Returns the most similar matches based on the query embedding vector.
Supports optional metadata filtering by home_team, away_team, or matchweek.';

