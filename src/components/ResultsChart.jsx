import React, { useState, useMemo, useRef, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { FaTrophy, FaTimes, FaHandshake } from 'react-icons/fa';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ResultsChart = ({ matches }) => {
  const [showHomeWins, setShowHomeWins] = useState(true);
  const [showAwayWins, setShowAwayWins] = useState(true);
  const [showDraws, setShowDraws] = useState(true);
  const [hoveredLegend, setHoveredLegend] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const chartData = useMemo(() => {
    if (!matches || matches.length === 0) return null;

    return matches.map((match, index) => {
      // Handle both API formats: new format (home_team_score) and old format (goals.home)
      const homeGoals = match.home_team_score !== undefined 
        ? parseInt(match.home_team_score || 0, 10)
        : (match.goals?.home || 0);
      const awayGoals = match.away_team_score !== undefined
        ? parseInt(match.away_team_score || 0, 10)
        : (match.goals?.away || 0);
      
      // Handle team names from both formats
      const homeTeam = match.home_team || match.teams?.home?.name || 'Home Team';
      const awayTeam = match.away_team || match.teams?.away?.name || 'Away Team';
      
      // Handle date from both formats
      const matchDate = match.date || match.fixture?.date;
      const formattedDate = matchDate 
        ? new Date(matchDate).toLocaleDateString()
        : 'Unknown Date';
      
      let result, resultValue, color, icon;
      if (homeGoals > awayGoals) {
        result = 'Home Win';
        resultValue = 1; // 1 for win (positive bar)
        color = '#00FF85'; // Green for wins
        icon = <FaTrophy />;
      } else if (awayGoals > homeGoals) {
        result = 'Away Win';
        resultValue = -1; // -1 for loss (negative bar)
        color = '#F44336'; // Red for losses
        icon = <FaTimes />;
      } else {
        result = 'Draw';
        resultValue = 0; // 0 for draw (small bar)
        color = '#FFC107'; // Yellow for draws
        icon = <FaHandshake />;
      }

      return {
        matchNumber: index + 1,
        date: formattedDate,
        result,
        resultValue,
        color,
        icon,
        homeTeam,
        awayTeam,
        homeGoals,
        awayGoals,
        score: `${homeGoals}-${awayGoals}`,
        venue: 'League Match'
      };
    });
  }, [matches]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { homeWins: 0, awayWins: 0, totalWins: 0, draws: 0, total: 0, winRate: '0', drawRate: '0' };
    }

    const homeWins = chartData.filter(item => item.result === 'Home Win').length;
    const awayWins = chartData.filter(item => item.result === 'Away Win').length;
    const draws = chartData.filter(item => item.result === 'Draw').length;
    const total = chartData.length;
    const totalWins = homeWins + awayWins;

    return {
      homeWins,
      awayWins,
      totalWins,
      draws,
      total,
      winRate: total > 0 ? ((totalWins / total) * 100).toFixed(1) : '0',
      drawRate: total > 0 ? ((draws / total) * 100).toFixed(1) : '0'
    };
  }, [chartData]);

  // Prepare Chart.js data
  const barChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;

    const labels = chartData.map(item => `Match ${item.matchNumber}`);
    
    // Create gradient functions for each bar
    const createGradient = (ctx, color, isWin) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, 400);
      if (isWin) {
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, '#00cc6a');
      } else {
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, '#cc0000');
      }
      return gradient;
    };

    const winData = chartData.map(item => item.resultValue === 1 ? 1 : 0);
    const lossData = chartData.map(item => item.resultValue === -1 ? -1 : 0);
    const drawData = chartData.map(item => item.resultValue === 0 ? 0.5 : 0);

    return {
      labels,
      datasets: [
        {
          label: 'Wins',
          data: winData,
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return '#00FF85';
            return createGradient(ctx, '#00FF85', true);
          },
          borderColor: '#00cc6a',
          borderWidth: 2,
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: 'Losses',
          data: lossData,
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return '#F44336';
            return createGradient(ctx, '#F44336', false);
          },
          borderColor: '#cc0000',
          borderWidth: 2,
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: 'Draws',
          data: drawData,
          backgroundColor: '#FFC107',
          borderColor: '#ff9800',
          borderWidth: 2,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    };
  }, [chartData]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: isLoaded ? 0 : 1000,
      easing: 'easeOut',
      onComplete: () => setIsLoaded(true),
    },
    interaction: {
      mode: 'index',
      intersect: false,
      // Ensure tooltip shows for all datasets at the same index
      axis: 'x',
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#374151',
        borderColor: '#04f5ff',
        borderWidth: 2,
        padding: 12,
        cornerRadius: 8,
        displayColors: false, // Don't show dataset colors, we'll show custom info
        // Don't filter out any tooltip items - show all datasets
        filter: function() {
          return true;
        },
        callbacks: {
          // Get the index from the first context item (all datasets share the same index)
          title: function(context) {
            // context is an array of tooltip items, one per dataset
            // All items at the same index point to the same match
            const firstItem = Array.isArray(context) ? context[0] : context;
            const index = firstItem?.dataIndex ?? -1;
            
            if (index === -1 || !chartData || !chartData[index]) return '';
            const match = chartData[index];
            return `Match #${match.matchNumber} - ${match.date}`;
          },
          // Show match info in label callback - this ensures tooltip always appears
          label: function(context) {
            // Get the index - handle both array and single item contexts
            let index = -1;
            if (Array.isArray(context)) {
              // Find first item with valid dataIndex
              const firstItem = context.find(item => item.dataIndex !== undefined) || context[0];
              index = firstItem?.dataIndex ?? -1;
            } else {
              index = context?.dataIndex ?? -1;
            }
            
            if (index === -1 || !chartData || !chartData[index]) return '';
            const match = chartData[index];
            
            // Show match info for all datasets (Chart.js will deduplicate if needed)
            // This ensures tooltip shows even when only one dataset has a value
            return [
              `${match.homeTeam} ${match.homeGoals} - ${match.awayGoals} ${match.awayTeam}`,
              `Result: ${match.result}`,
            ];
          },
          // Also add to afterBody as backup
          afterBody: function() {
            // Return empty to avoid duplication (label already shows the info)
            return [];
          },
          // Suppress default dataset labels
          labelTextColor: function() {
            return '#374151';
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 10,
          },
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        max: 1.5,
        min: -1.5,
        ticks: {
          stepSize: 0.5,
          callback: function(value) {
            if (value === 1) return 'Win';
            if (value === -1) return 'Loss';
            if (value === 0) return 'Draw';
            return '';
          },
        },
        grid: {
          color: '#e5e7eb',
          lineWidth: 1,
        },
      },
    },
    onHover: (event, activeElements) => {
      const chart = chartRef.current;
      if (!chart) return;

      if (activeElements.length > 0) {
        chart.canvas.style.cursor = 'pointer';
        // Apply hover effects: brightness and scale
        activeElements.forEach((element) => {
          const meta = chart.getDatasetMeta(element.datasetIndex);
          const bar = meta.data[element.index];
          if (bar) {
            // Apply brightness filter via CSS
            bar.options.backgroundColor = () => {
              const originalColor = element.datasetIndex === 0 ? '#00FF85' : 
                                   element.datasetIndex === 1 ? '#F44336' : '#FFC107';
              return originalColor;
            };
          }
        });
        chart.update('none');
      } else {
        chart.canvas.style.cursor = 'default';
        chart.update('none');
      }
    },
    elements: {
      bar: {
        hoverBackgroundColor: (context) => {
          const datasetIndex = context.datasetIndex;
          if (datasetIndex === 0) return '#00FF85'; // Bright green for wins
          if (datasetIndex === 1) return '#F44336'; // Bright red for losses
          return '#FFC107'; // Yellow for draws
        },
        hoverBorderWidth: 3,
        hoverBorderColor: '#04f5ff',
        hoverBorderRadius: 6,
      },
    },
  }), [chartData, isLoaded]);

  if (!chartData || chartData.length === 0) {
    return null;
  }


  return (
    <motion.div
      className="bg-gradient-to-b from-white to-gray-50 dark:from-neutral-900 dark:to-neutral-800 rounded-xl shadow-lg p-6 border border-gray-200/50 dark:border-neutral-700/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
            Match Results Timeline
          </h2>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4">
          <div className="control-group flex flex-wrap gap-2">
            <motion.button 
              className={`px-4 py-2 rounded-lg border-2 transition-all duration-300 flex items-center space-x-2 ${
                showHomeWins 
                  ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-400' 
                  : 'bg-gray-100 dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => setShowHomeWins(!showHomeWins)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaTrophy />
              <span>Home Wins ({stats.homeWins})</span>
            </motion.button>
            
            <motion.button 
              className={`px-4 py-2 rounded-lg border-2 transition-all duration-300 flex items-center space-x-2 ${
                showAwayWins 
                  ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-400' 
                  : 'bg-gray-100 dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => setShowAwayWins(!showAwayWins)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaTrophy />
              <span>Away Wins ({stats.awayWins})</span>
            </motion.button>
            
            <motion.button 
              className={`px-4 py-2 rounded-lg border-2 transition-all duration-300 flex items-center space-x-2 ${
                showDraws 
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500 text-yellow-700 dark:text-yellow-400' 
                  : 'bg-gray-100 dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => setShowDraws(!showDraws)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaHandshake />
            <span>Draws ({stats.draws})</span>
          </motion.button>
        </div>
      </div>

        {/* Stats Summary with Interactive Win Rate */}
        <div className="grid grid-cols-3 gap-4">
          <motion.div
            className="stat-card bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-lg p-4 shadow border border-gray-200/50 dark:border-neutral-700/50 text-center"
            whileHover={{ scale: 1.05, y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <span className="stat-label block text-sm text-gray-600 dark:text-gray-400 mb-1">Win Rate</span>
            <motion.span
              className={`stat-value text-2xl font-heading font-bold text-primary dark:text-accent cursor-pointer ${
                hoveredLegend === 'winRate' ? 'underline text-green-400' : ''
              }`}
              onMouseEnter={() => setHoveredLegend('winRate')}
              onMouseLeave={() => setHoveredLegend(null)}
              whileHover={{ scale: 1.1 }}
            >
              {stats.winRate}%
            </motion.span>
          </motion.div>
          <div className="stat-card bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-lg p-4 shadow border border-gray-200/50 dark:border-neutral-700/50 text-center">
            <span className="stat-label block text-sm text-gray-600 dark:text-gray-400 mb-1">Draw Rate</span>
            <span className="stat-value text-2xl font-heading font-bold text-yellow-600 dark:text-yellow-400">{stats.drawRate}%</span>
          </div>
          <div className="stat-card bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-lg p-4 shadow border border-gray-200/50 dark:border-neutral-700/50 text-center">
            <span className="stat-label block text-sm text-gray-600 dark:text-gray-400 mb-1">Total Matches</span>
            <span className="stat-value text-2xl font-heading font-bold text-gray-900 dark:text-white">{stats.total}</span>
          </div>
        </div>

        {/* Chart */}
        <motion.div
          className="relative"
          style={{ height: '400px' }}
          initial="hidden"
          animate={isLoaded ? "visible" : "hidden"}
        >
          <AnimatePresence>
            {barChartData && (
              <motion.div
                key="chart"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Bar
                  ref={chartRef}
                  data={barChartData}
                  options={{
                    ...chartOptions,
                    animation: {
                      ...chartOptions.animation,
                      onProgress: (animation) => {
                        // Custom animation for bars growing from bottom
                        const chart = animation.chart;
                        const meta = chart.getDatasetMeta(0);
                        meta.data.forEach((bar) => {
                          const value = bar.getProps(['y'], true).y;
                          const base = chart.scales.y.getPixelForValue(0);
                          bar.y = base;
                          bar.height = value - base;
                        });
                      },
                    },
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      </div>
    </motion.div>
  );
};

export default ResultsChart;
