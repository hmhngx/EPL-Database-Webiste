import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const CumulativePointsChart = ({ matches, standings, venue, gameweekRange, selectedTeams }) => {
  const chartData = useMemo(() => {
    if (!matches || matches.length === 0 || !standings || standings.length === 0) {
      return null;
    }

    // Get all gameweeks in range
    const gameweeks = Array.from({ length: gameweekRange[1] - gameweekRange[0] + 1 }, (_, i) => gameweekRange[0] + i);

    // Filter teams based on selection
    const teamsToShow = selectedTeams.length > 0
      ? standings.filter(team => selectedTeams.includes(team.team_id))
      : standings;

    // Calculate cumulative points for each team
    const datasets = teamsToShow.map((team, index) => {
      const cumulativePoints = gameweeks.map(gameweek => {
        // Get all matches for this team up to and including this gameweek
        // We need ALL matches up to this gameweek, not just those in the range
        const teamMatches = matches.filter(match => {
          // Check if this match involves the team
          const isHome = match.home_team_id === team.team_id;
          const isAway = match.away_team_id === team.team_id;
          if (!isHome && !isAway) return false;

          // Apply venue filter
          if (venue === 'home' && !isHome) return false;
          if (venue === 'away' && !isAway) return false;

          // Get gameweek for this match
          let matchGameweek = match.gameweek || match.matchweek;
          if (!matchGameweek || matchGameweek < 1 || matchGameweek > 38) {
            matchGameweek = calculateGameweek(match.date, matches);
          }
          
          // Only include matches up to and including the current gameweek
          return matchGameweek <= gameweek;
        });

        // Calculate cumulative points from all matches up to this gameweek
        const points = teamMatches.reduce((sum, match) => {
          const isHome = match.home_team_id === team.team_id;
          const homeScore = parseInt(match.home_team_score || 0, 10);
          const awayScore = parseInt(match.away_team_score || 0, 10);

          if (isHome) {
            if (homeScore > awayScore) return sum + 3;
            if (homeScore === awayScore) return sum + 1;
            return sum;
          } else {
            if (awayScore > homeScore) return sum + 3;
            if (awayScore === homeScore) return sum + 1;
            return sum;
          }
        }, 0);

        return points;
      });

      // Generate a color for this team
      const colors = [
        '#00FF85', '#04f5ff', '#FF6B6B', '#4ECDC4', '#45B7D1',
        '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
        '#F8B739', '#E74C3C', '#9B59B6', '#1ABC9C', '#3498DB',
        '#E67E22', '#95A5A6', '#34495E', '#16A085', '#27AE60'
      ];
      const color = colors[index % colors.length];

      return {
        label: team.team_name,
        data: cumulativePoints,
        borderColor: color,
        backgroundColor: color + '20',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
      };
    });

    return {
      labels: gameweeks.map(gw => `GW ${gw}`),
      datasets,
    };
  }, [matches, standings, venue, gameweekRange, selectedTeams]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Cumulative Points Progression',
        font: {
          size: 18,
          weight: 'bold',
        },
        color: '#1f2937',
      },
      legend: {
        display: true,
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 11,
          },
          filter: (item) => {
            // Only show legend for visible teams
            return selectedTeams.length === 0 || selectedTeams.includes(item.datasetIndex);
          },
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: (context) => {
            return `Gameweek ${gameweekRange[0] + context[0].dataIndex}`;
          },
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y} points`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Gameweek',
          font: {
            size: 12,
            weight: 'bold',
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Cumulative Points',
          font: {
            size: 12,
            weight: 'bold',
          },
        },
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  }), [gameweekRange, selectedTeams]);

  if (!chartData || chartData.datasets.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500 dark:text-gray-400">
        <p>No data available for the selected filters</p>
      </div>
    );
  }

  return (
    <div className="h-96">
      <Line data={chartData} options={options} />
    </div>
  );
};

// Helper function to calculate gameweek from date if not provided
// This is a fallback - ideally gameweek should be in the database
function calculateGameweek(matchDate, allMatches) {
  if (!matchDate || !allMatches || allMatches.length === 0) return 1;

  // Sort all matches by date
  const sortedMatches = [...allMatches].sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });

  // Find the index of this match by comparing dates
  // matchDate could be a string or a match object
  const targetDate = typeof matchDate === 'string' ? new Date(matchDate) : new Date(matchDate.date || matchDate);
  const matchIndex = sortedMatches.findIndex(m => {
    const mDate = new Date(m.date);
    // Consider matches on the same day as the same gameweek
    return mDate.toDateString() === targetDate.toDateString();
  });
  
  if (matchIndex === -1) {
    // If not found, estimate based on date position
    const estimatedIndex = sortedMatches.findIndex(m => new Date(m.date) >= targetDate);
    if (estimatedIndex === -1) return 38; // If date is after all matches, it's the last gameweek
    return Math.floor(estimatedIndex / 10) + 1;
  }

  // Calculate gameweek (approximately 10 matches per gameweek in Premier League)
  // Premier League has 20 teams, so 10 matches per gameweek (each team plays once)
  return Math.min(Math.floor(matchIndex / 10) + 1, 38);
}

export default CumulativePointsChart;
