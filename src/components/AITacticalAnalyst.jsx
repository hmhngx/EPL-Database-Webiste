import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FaBrain, FaSpinner } from 'react-icons/fa';

/**
 * AITacticalAnalyst Component
 * Displays AI-generated tactical analysis with a typewriter effect
 * 
 * @param {Object} props
 * @param {Array<Object>} props.timeseries - Timeseries analytics data
 * @param {string} props.teamColor - Team color for styling
 */
const AITacticalAnalyst = ({ timeseries, teamColor = '#38003C' }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typeIntervalRef = useRef(null);

  // Fetch AI analysis when timeseries data is available
  useEffect(() => {
    if (!timeseries || timeseries.length === 0) {
      return;
    }

    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      setDisplayedText('');
      setIsTyping(false);

      // Clear any existing interval
      if (typeIntervalRef.current) {
        clearInterval(typeIntervalRef.current);
        typeIntervalRef.current = null;
      }

      try {
        const response = await fetch('/api/ai/club-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ timeseries }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 404) {
            throw new Error('AI analysis route not found. Please ensure the server has been restarted.');
          }
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.data.analysis) {
          setAnalysis(data.data.analysis);
          // Start typewriter effect
          setIsTyping(true);
          typewriterEffect(data.data.analysis);
        } else {
          throw new Error('Invalid response format from AI service');
        }
      } catch (err) {
        console.error('Error fetching AI analysis:', err);
        setError(err.message || 'Failed to generate AI analysis');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();

    // Cleanup function to clear interval on unmount or when timeseries changes
    return () => {
      if (typeIntervalRef.current) {
        clearInterval(typeIntervalRef.current);
        typeIntervalRef.current = null;
      }
    };
  }, [timeseries]);

  /**
   * Typewriter effect to display text character by character
   * This hides the latency while the AI generates the response
   */
  const typewriterEffect = (text) => {
    if (!text) return;

    let currentIndex = 0;
    setDisplayedText('');

    // Clear any existing interval
    if (typeIntervalRef.current) {
      clearInterval(typeIntervalRef.current);
    }

    typeIntervalRef.current = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        if (typeIntervalRef.current) {
          clearInterval(typeIntervalRef.current);
          typeIntervalRef.current = null;
        }
        setIsTyping(false);
      }
    }, 20); // Adjust speed: lower = faster, higher = slower
  };

  // Don't render if no timeseries data
  if (!timeseries || timeseries.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-white to-gray-50 dark:from-neutral-800 dark:to-neutral-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-neutral-700"
    >
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${teamColor}15` }}
        >
          <FaBrain 
            className="text-xl"
            style={{ color: teamColor }}
          />
        </div>
        <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
          AI Performance Insight
        </h2>
      </div>

      {loading && (
        <div className="py-4">
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 mb-2">
            <FaSpinner className="animate-spin" />
            <span>Analyzing season performance...</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 font-body" style={{ fontFamily: 'Chakra Petch, monospace' }}>
            AI responses are synthesized from the currently filtered corpus.
          </p>
        </div>
      )}

      {error && (
        <div className="text-rose-600 dark:text-rose-400 py-4">
          <p className="font-semibold">Archive Assistant is currently re-indexing. Please try again in a moment.</p>
        </div>
      )}

      {analysis && (
        <div className="space-y-3">
          <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-serif">
            {displayedText}
            {isTyping && (
              <span 
                className="inline-block w-2 h-4 ml-1 bg-current animate-pulse"
                style={{ color: teamColor }}
              />
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AITacticalAnalyst;
