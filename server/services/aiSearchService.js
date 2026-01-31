/**
 * AI Search Service for Match RAG Pipeline
 * 
 * Provides semantic search functionality using OpenAI embeddings and Supabase vector search.
 * 
 * Features:
 * - Converts natural language queries to embeddings
 * - Performs semantic search using match_semantic_search function
 * - Returns top relevant matches for LLM context
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configuration
const CONFIG = {
  embeddingModel: 'text-embedding-3-small',
  embeddingDimensions: 1536,
  defaultMatchCount: 3,
  maxMatchCount: 10
};

/**
 * Generate embedding for a natural language query
 * 
 * @param {string} query - Natural language query (e.g., "Tell me about high-scoring games in London")
 * @returns {Promise<Array<number>>} Embedding vector
 */
export async function generateQueryEmbedding(query) {
  try {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Invalid query input for embedding generation');
    }

    const response = await openai.embeddings.create({
      model: CONFIG.embeddingModel,
      input: query.trim(),
      dimensions: CONFIG.embeddingDimensions
    });

    if (!response.data || !response.data[0] || !response.data[0].embedding) {
      throw new Error('Invalid embedding response from OpenAI');
    }

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error);
    throw new Error(`Failed to generate query embedding: ${error.message}`);
  }
}

/**
 * Perform semantic search for matches
 * 
 * @param {Object} pool - PostgreSQL connection pool
 * @param {string} query - Natural language query
 * @param {Object} options - Search options
 * @param {number} options.matchCount - Number of matches to return (default: 3)
 * @param {Object} options.filterMetadata - Optional metadata filters (e.g., {home_team: "Arsenal"})
 * @returns {Promise<Array<Object>>} Array of relevant matches with content_text
 */
export async function searchMatches(pool, query, options = {}) {
  try {
    const { matchCount = CONFIG.defaultMatchCount, filterMetadata = {} } = options;
    
    // Validate matchCount
    const validMatchCount = Math.min(Math.max(1, matchCount), CONFIG.maxMatchCount);
    
    // Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(query);
    
    // Convert embedding array to PostgreSQL vector format
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    
    // Convert filterMetadata to JSONB string
    const filterMetadataStr = JSON.stringify(filterMetadata);
    
    // Call the match_semantic_search function
    const result = await pool.query(
      `SELECT * FROM match_semantic_search($1::vector, $2, $3::jsonb)`,
      [embeddingStr, validMatchCount, filterMetadataStr]
    );
    
    return result.rows.map(row => ({
      match_id: row.match_id,
      content_text: row.content_text,
      similarity: row.similarity,
      metadata: row.metadata,
      home_team: row.home_team,
      away_team: row.away_team,
      score: row.score,
      matchweek: row.matchweek,
      date: row.date
    }));
  } catch (error) {
    console.error('Error performing semantic search:', error);
    
    // Handle specific error cases
    if (error.message.includes('function') && error.message.includes('does not exist')) {
      throw new Error('match_semantic_search function not found. Please run the database migration.');
    }
    
    if (error.message.includes('operator does not exist') || error.message.includes('vector')) {
      throw new Error('pgvector extension not available. Please enable it in your database.');
    }
    
    throw new Error(`Failed to perform semantic search: ${error.message}`);
  }
}

/**
 * Get relevant match context for LLM
 * Returns top N most relevant matches as context strings
 * 
 * @param {Object} pool - PostgreSQL connection pool
 * @param {string} query - Natural language query
 * @param {Object} options - Search options
 * @returns {Promise<Array<string>>} Array of content_text strings for LLM context
 */
export async function getMatchContextForLLM(pool, query, options = {}) {
  try {
    const matches = await searchMatches(pool, query, options);
    
    // Return just the content_text for LLM context
    return matches.map(match => match.content_text);
  } catch (error) {
    console.error('Error getting match context for LLM:', error);
    throw error;
  }
}

/**
 * Get relevant matches with full details
 * 
 * @param {Object} pool - PostgreSQL connection pool
 * @param {string} query - Natural language query
 * @param {Object} options - Search options
 * @returns {Promise<Array<Object>>} Array of match objects with full details
 */
export async function getRelevantMatches(pool, query, options = {}) {
  try {
    return await searchMatches(pool, query, options);
  } catch (error) {
    console.error('Error getting relevant matches:', error);
    throw error;
  }
}

export default {
  generateQueryEmbedding,
  searchMatches,
  getMatchContextForLLM,
  getRelevantMatches
};

